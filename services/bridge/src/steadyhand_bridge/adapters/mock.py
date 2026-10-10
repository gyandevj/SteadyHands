"""Deterministic mock adapter for development and testing without physical hardware."""

import asyncio
import math
import time
import uuid
from typing import Optional, List, Tuple
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


class MockDeviceAdapter(BaseDeviceAdapter):
    """Generates deterministic synthetic accelerometer batches at ~100 Hz."""

    def __init__(
        self,
        odr_hz: float = 100.0,
        batch_size: int = 10,
        tremor_hz: float = 5.0,
        tremor_amplitude_g: float = 0.04,
        haptics_enabled: bool = False,
    ):
        self.odr_hz = odr_hz
        self.batch_size = min(batch_size, 50)
        self.sample_interval_us = int(1_000_000 / odr_hz)
        self.tremor_hz = tremor_hz
        self.tremor_amplitude_g = tremor_amplitude_g
        self.haptics_enabled = haptics_enabled

        self._running = False
        self._boot_id = f"mock-boot-{uuid.uuid4().hex[:8]}"
        self._stream_id = f"mock-stream-{uuid.uuid4().hex[:8]}"
        self._seq = 0
        self._batch_seq = 0
        self._t_us = 0
        self._last_drain_time = 0.0

        # Fault injection hooks
        self._stall_until_monotonic = 0.0
        self._simulate_saturation = False
        self._counters = BatchCounters(i2c_errors=0, dropped_samples=0, queue_overflows=0)

    @property
    def source(self) -> DataSource:
        return "synthetic"

    def is_connected(self) -> bool:
        return self._running

    def reboot(self) -> None:
        """Simulate an MCU restart: rotates boot_id, stream_id, resets sequence numbers."""
        self._boot_id = f"mock-boot-{uuid.uuid4().hex[:8]}"
        self._stream_id = f"mock-stream-{uuid.uuid4().hex[:8]}"
        self._seq = 0
        self._batch_seq = 0
        self._t_us = 0

    def stall(self, duration_s: float) -> None:
        """Simulate a stream pause/stall."""
        self._stall_until_monotonic = time.monotonic() + duration_s

    async def start(self) -> None:
        self._running = True
        self._last_drain_time = time.monotonic()

    async def stop(self) -> None:
        self._running = False

    def get_hello(self) -> DeviceHello:
        return DeviceHello(
            v=1,
            type="device.hello",
            source=self.source,
            boot_id=self._boot_id,
            stream_id=self._stream_id,
            sensor=SensorCapability(
                model="LIS3DHTR (Synthetic Mock)",
                bus="Wire",
                address_hex="0x19",
                odr_hz=self.odr_hz,
                range_g=2.0,
                units="g",
                resolution_bits=12,
                haptics=self.haptics_enabled,
            ),
            capabilities=DeviceCapabilities(
                haptics=self.haptics_enabled,
            ),
        )

    async def drain_batch(self) -> Optional[SensorBatch]:
        if not self._running:
            return None

        now = time.monotonic()
        if now < self._stall_until_monotonic:
            return None

        # Cadence check for batch interval (e.g. 10 samples at 100 Hz = 100 ms)
        batch_interval_s = self.batch_size / self.odr_hz
        if (now - self._last_drain_time) < (batch_interval_s * 0.8):
            # Not enough time elapsed for a full batch
            await asyncio.sleep(0.01)
            return None

        self._last_drain_time = now

        samples: List[SensorSample] = []
        for _ in range(self.batch_size):
            t_sec = self._t_us / 1_000_000.0

            # Generate synthetic signal:
            # 1.0 g gravity on Z axis
            # Tremor component on X and Y
            phase = 2.0 * math.pi * self.tremor_hz * t_sec
            ax = self.tremor_amplitude_g * math.sin(phase)
            ay = self.tremor_amplitude_g * math.cos(phase)
            az = 0.98 + (0.005 * math.sin(phase * 0.5))

            saturated = False
            if self._simulate_saturation:
                ax = 2.05
                saturated = True

            samples.append(
                SensorSample(
                    seq=self._seq,
                    t_us=self._t_us,
                    a_g=(round(ax, 4), round(ay, 4), round(az, 4)),
                    valid=True,
                    saturated=saturated,
                    haptic_active=False,
                )
            )
            self._seq += 1
            self._t_us += self.sample_interval_us

        batch = SensorBatch(
            v=1,
            type="sensor.batch",
            source=self.source,
            boot_id=self._boot_id,
            stream_id=self._stream_id,
            batch_seq=self._batch_seq,
            samples=samples,
            counters=self._counters,
        )
        self._batch_seq += 1
        return batch
