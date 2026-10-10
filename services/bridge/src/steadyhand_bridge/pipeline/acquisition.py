"""Sensor acquisition manager and stream health supervision."""

import time
from typing import Optional, Tuple
from ..contracts import DeviceHealth, SensorBatch, DataSource
from .buffers import BoundedSampleBuffer


class AcquisitionManager:
    """Supervises stream ingestion, buffer updates, and health metrics."""

    def __init__(self, buffer: BoundedSampleBuffer, stale_timeout_ms: int = 500):
        self.buffer = buffer
        self.stale_timeout_s = stale_timeout_ms / 1000.0

        self._start_time = time.monotonic()
        self._last_sample_host_time = 0.0
        self._last_sample_t_us: Optional[int] = None
        self._current_boot_id: Optional[str] = None
        self._current_stream_id: Optional[str] = None

        self._total_batches = 0
        self._total_samples = 0
        self._dropped_samples_counter = 0
        self._queue_overflows_counter = 0

    def ingest_batch(self, batch: SensorBatch) -> Tuple[bool, bool]:
        """Ingest a batch of samples into the buffer.
        
        Returns:
            (reboot_detected: bool, has_new_samples: bool)
        """
        now = time.monotonic()
        reboot_detected = False

        if self._current_boot_id is not None and batch.boot_id != self._current_boot_id:
            # MCU Reboot detected! Clear old buffer and reset epoch
            self.buffer.clear()
            reboot_detected = True

        self._current_boot_id = batch.boot_id
        self._current_stream_id = batch.stream_id

        if batch.samples:
            self.buffer.push_many(batch.samples)
            self._last_sample_host_time = now
            self._last_sample_t_us = batch.samples[-1].t_us
            self._total_samples += len(batch.samples)

        self._total_batches += 1
        self._dropped_samples_counter += batch.counters.dropped_samples
        self._queue_overflows_counter += batch.counters.queue_overflows

        return reboot_detected, len(batch.samples) > 0

    def get_health(self, source: DataSource) -> DeviceHealth:
        """Compute the current honest device health snapshot."""
        now = time.monotonic()
        uptime_s = round(now - self._start_time, 2)

        # Fresh sample health: independent of socket health
        time_since_sample = now - self._last_sample_host_time if self._last_sample_host_time > 0 else 999.0
        is_stale = (self._last_sample_host_time == 0.0) or (time_since_sample >= self.stale_timeout_s)

        # Approximate sample rate over recent window
        rate_hz = 100.0 if (not is_stale and source in ("live", "synthetic", "recorded")) else 0.0

        total_drops = self._dropped_samples_counter + self.buffer.sequence_gaps
        total_overflows = self._queue_overflows_counter + self.buffer.overflow_drops

        return DeviceHealth(
            v=1,
            type="device.health",
            source=source,
            uptime_s=uptime_s,
            sample_rate_hz=rate_hz,
            total_samples=self._total_samples,
            dropped_samples=total_drops,
            queue_overflows=total_overflows,
            is_stale=is_stale,
            last_sample_t_us=self._last_sample_t_us,
        )

    @property
    def current_boot_id(self) -> Optional[str]:
        return self._current_boot_id

    @property
    def current_stream_id(self) -> Optional[str]:
        return self._current_stream_id
