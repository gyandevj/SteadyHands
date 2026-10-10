"""Host-side adapter for Arduino UNO Q hardware bridge."""

import asyncio
import json
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


class UnoQDeviceAdapter(BaseDeviceAdapter):
    """Host adapter connecting to Arduino UNO Q bridge.
    
    If the board or port is unavailable, reports explicit 'unavailable' source.
    Never reports 'live' without verified physical communication.
    """

    def __init__(
        self,
        port: str = "COM3",
        baud: int = 115200,
        haptics_enabled: bool = False,
    ):
        self.port = port
        self.baud = baud
        self.haptics_enabled = haptics_enabled

        self._connected = False
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
        """Attempt connection to UNO Q. If hardware is absent, logs error and stays unavailable."""
        try:
            # We check if pyserial is available, otherwise record explicit missing transport
            try:
                import serial  # type: ignore[import-untyped]
                # In actual hardware run, open port with read timeout
                # self._ser = serial.Serial(self.port, self.baud, timeout=0.1)
                # For safety when testing on host without physical board, mark explicit status
                self._transport_error = f"Physical board port {self.port} not yet probed or opened"
            except ImportError:
                self._transport_error = "pyserial not installed in host environment"
        except Exception as e:
            self._transport_error = str(e)
            self._connected = False

    async def stop(self) -> None:
        self._connected = False

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

        # Honest unconfigured / unavailable hello
        return DeviceHello(
            v=1,
            type="device.hello",
            source="unavailable",
            boot_id="unoq-unconnected",
            stream_id="stream-unconnected",
            sensor=SensorCapability(
                model="Unconnected UNO Q Sensor",
                bus="Wire",
                address_hex="0x00",
                odr_hz=100.0,
                range_g=2.0,
                units="g",
                haptics=False,
            ),
            capabilities=DeviceCapabilities(haptics=False),
        )

    async def drain_batch(self) -> Optional[SensorBatch]:
        if not self._connected:
            return None
        # Drain line from hardware, parse JSON batch
        return None
