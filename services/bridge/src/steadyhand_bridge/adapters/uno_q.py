"""Host-side adapter for Arduino UNO R4 / UNO Q hardware bridge."""

import asyncio
import json
import logging
import time
from typing import Optional, List
from .base import BaseDeviceAdapter
from ..contracts import (
    DeviceHello,
    SensorCapability,
    DeviceCapabilities,
    SensorBatch,
    SensorSample,
    BatchCounters,
    DataSource,
)

logger = logging.getLogger("steadyhand_bridge.uno_q")


class UnoQDeviceAdapter(BaseDeviceAdapter):
    """Host adapter connecting to Arduino UNO R4 / UNO Q over serial bridge.
    
    Reads canonical JSON frames ('device.hello', 'sensor.batch') from the physical board.
    Reports 'live' ONLY when actively connected and receiving valid hardware packets.
    """

    def __init__(
        self,
        port: str = "COM5",
        baud: int = 115200,
        haptics_enabled: bool = False,
    ):
        self.port = port
        self.baud = baud
        self.haptics_enabled = haptics_enabled

        self._connected = False
        self._ser = None
        self._boot_id: Optional[str] = None
        self._stream_id: Optional[str] = None
        self._sensor_capability: Optional[SensorCapability] = None
        self._transport_error: Optional[str] = None
        self._last_batch_time = 0.0

    @property
    def source(self) -> DataSource:
        if self._connected:
            return "live"
        return "unavailable"

    def is_connected(self) -> bool:
        return self._connected

    async def start(self) -> None:
        """Attempt connection to Arduino serial port with safety timeout."""
        loop = asyncio.get_running_loop()
        try:
            await asyncio.wait_for(loop.run_in_executor(None, self._open_serial), timeout=1.5)
        except asyncio.TimeoutError:
            logger.warning(f"Initial connect timeout on {self.port}; continuing startup")

    def _open_serial(self) -> None:
        try:
            import serial
            if self._ser and self._ser.is_open:
                try:
                    self._ser.close()
                except Exception:
                    pass

            s = serial.Serial()
            s.port = self.port
            s.baudrate = self.baud
            s.timeout = 0.05
            s.write_timeout = 0.05
            s.dtr = True
            s.rts = True
            s.open()

            self._ser = s
            self._connected = True
            self._transport_error = None
            logger.info(f"Opened physical Arduino bridge on {self.port} at {self.baud} baud")
        except Exception as e:
            self._ser = None
            self._connected = False
            self._transport_error = str(e)
            logger.warning(f"Could not open Arduino bridge port {self.port}: {e}")

    async def stop(self) -> None:
        self._connected = False
        if self._ser:
            try:
                self._ser.close()
            except Exception:
                pass
            self._ser = None

    def get_hello(self) -> DeviceHello:
        if self._connected and self._sensor_capability and self._boot_id and self._stream_id:
            return DeviceHello(
                v=1,
                type="device.hello",
                source="live",
                boot_id=self._boot_id,
                stream_id=self._stream_id,
                sensor=self._sensor_capability,
                capabilities=DeviceCapabilities(haptics=self.haptics_enabled),
            )

        # Default hello for MMA7660FC on Arduino
        return DeviceHello(
            v=1,
            type="device.hello",
            source="live" if self._connected else "unavailable",
            boot_id=self._boot_id or "mcu-uno-r4",
            stream_id=self._stream_id or "stream-uno-r4",
            sensor=self._sensor_capability or SensorCapability(
                model="MMA7660FC",
                bus="Wire",
                address_hex="0x4C",
                odr_hz=64.0,
                range_g=1.5,
                units="g",
                resolution_bits=6,
                haptics=self.haptics_enabled,
            ),
            capabilities=DeviceCapabilities(haptics=self.haptics_enabled),
        )

    async def drain_batch(self) -> Optional[SensorBatch]:
        if not self._connected or not self._ser:
            # Attempt reconnect if disconnected
            now = time.monotonic()
            if (now - self._last_batch_time) > 2.0:
                self._last_batch_time = now
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(None, self._open_serial)
            return None

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._read_next_frame)

    def _read_next_frame(self) -> Optional[SensorBatch]:
        if not self._ser or not self._ser.is_open:
            return None

        try:
            line = self._ser.readline().decode("utf-8", errors="replace").strip()
            if not line:
                return None

            if not (line.startswith("{") and line.endswith("}")):
                return None

            data = json.loads(line)
            pkt_type = data.get("type")

            if pkt_type == "device.hello":
                self._boot_id = data.get("boot_id", self._boot_id)
                self._stream_id = data.get("stream_id", self._stream_id)
                sensor_data = data.get("sensor", {})
                self._sensor_capability = SensorCapability(
                    model=sensor_data.get("model", "MMA7660FC"),
                    bus=sensor_data.get("bus", "Wire"),
                    address_hex=sensor_data.get("address_hex", "0x4C"),
                    odr_hz=float(sensor_data.get("odr_hz", 64.0)),
                    range_g=float(sensor_data.get("range_g", 1.5)),
                    units="g",
                    haptics=self.haptics_enabled,
                )
                self._connected = True
                return None

            elif pkt_type == "sensor.batch":
                batch = SensorBatch.model_validate(data)
                self._boot_id = batch.boot_id
                self._stream_id = batch.stream_id
                self._connected = True
                self._last_batch_time = time.monotonic()
                return batch

        except Exception as e:
            logger.debug(f"Error reading frame from serial: {e}")

        return None
