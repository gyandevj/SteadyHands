"""Replay adapter for recorded or synthetic sensor datasets."""

import asyncio
import json
import time
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any
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


class ReplayDeviceAdapter(BaseDeviceAdapter):
    """Replays pre-generated synthetic or recorded sensor fixtures."""

    def __init__(
        self,
        fixture_path: str,
        batch_size: int = 10,
        loop: bool = True,
        realtime: bool = True,
    ):
        self.fixture_path = Path(fixture_path)
        self.batch_size = min(batch_size, 50)
        self.loop = loop
        self.realtime = realtime

        self._running = False
        self._boot_id = f"replay-boot-{uuid.uuid4().hex[:8]}"
        self._stream_id = f"replay-stream-{uuid.uuid4().hex[:8]}"
        self._batch_seq = 0
        self._current_idx = 0
        self._last_drain_time = 0.0

        self._raw_samples: List[Dict[str, Any]] = []
        self._odr_hz: float = 100.0
        self._source: DataSource = "synthetic"

        self._load_fixture()

    def _load_fixture(self) -> None:
        if not self.fixture_path.exists():
            raise FileNotFoundError(f"Fixture file not found: {self.fixture_path}")

        with open(self.fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Detect source: if under fixtures/recorded, source is recorded; otherwise synthetic
        if "recorded" in str(self.fixture_path).lower():
            self._source = "recorded"
        else:
            self._source = "synthetic"

        self._odr_hz = float(data.get("odr_hz", 100.0))
        self._raw_samples = data.get("samples", [])
        if not self._raw_samples:
            raise ValueError(f"Fixture contains zero samples: {self.fixture_path}")

    @property
    def source(self) -> DataSource:
        return self._source

    def is_connected(self) -> bool:
        return self._running and (self._current_idx < len(self._raw_samples) or self.loop)

    async def start(self) -> None:
        self._running = True
        self._current_idx = 0
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
                model=f"Replay ({self.fixture_path.name})",
                bus="File",
                address_hex="0x00",
                odr_hz=self._odr_hz,
                range_g=2.0,
                units="g",
                resolution_bits=12,
                haptics=False,
            ),
            capabilities=DeviceCapabilities(
                haptics=False,
            ),
        )

    async def drain_batch(self) -> Optional[SensorBatch]:
        if not self._running:
            return None

        now = time.monotonic()
        if self.realtime:
            batch_interval_s = self.batch_size / self._odr_hz
            if (now - self._last_drain_time) < (batch_interval_s * 0.8):
                await asyncio.sleep(0.01)
                return None
            self._last_drain_time = now

        if self._current_idx >= len(self._raw_samples):
            if self.loop:
                self._current_idx = 0
            else:
                return None

        chunk = self._raw_samples[self._current_idx : self._current_idx + self.batch_size]
        self._current_idx += len(chunk)

        samples: List[SensorSample] = []
        for s in chunk:
            samples.append(
                SensorSample(
                    seq=int(s["seq"]),
                    t_us=int(s["t_us"]),
                    a_g=(float(s["a_g"][0]), float(s["a_g"][1]), float(s["a_g"][2])),
                    valid=bool(s.get("valid", True)),
                    saturated=bool(s.get("saturated", False)),
                    haptic_active=bool(s.get("haptic_active", False)),
                )
            )

        batch = SensorBatch(
            v=1,
            type="sensor.batch",
            source=self.source,
            boot_id=self._boot_id,
            stream_id=self._stream_id,
            batch_seq=self._batch_seq,
            samples=samples,
            counters=BatchCounters(i2c_errors=0, dropped_samples=0, queue_overflows=0),
        )
        self._batch_seq += 1
        return batch
