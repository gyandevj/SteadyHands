"""Sample validation and timebase verification for sensor streams."""

from typing import List, Tuple
from .models import SensorSample, WindowQuality


def validate_window(
    samples: List[SensorSample],
    expected_odr_hz: float = 100.0,
    max_gap_ms_threshold: float = 40.0,
    range_g: float = 2.0,
) -> WindowQuality:
    """Inspects raw sample array before numerical processing.

    Validates:
    - Minimum sample count (>= 32 samples)
    - Strictly monotonic timestamps (t_us)
    - Inter-sample gaps (flagged if > max_gap_ms_threshold)
    - Sequence continuity and missing fraction
    - Sensor saturation and hardware read validity
    - Measured sample rate vs expected ODR
    """
    reasons: List[str] = []

    # 1. Sample count check
    if not samples or len(samples) < 32:
        return WindowQuality(
            state="invalid",
            reasons=["insufficient_samples"],
            measured_hz=0.0,
            missing_fraction=1.0,
            max_gap_ms=0.0,
        )

    n = len(samples)
    t_start = samples[0].t_us
    t_end = samples[-1].t_us
    duration_us = t_end - t_start

    if duration_us <= 0:
        return WindowQuality(
            state="invalid",
            reasons=["zero_or_negative_duration"],
            measured_hz=0.0,
            missing_fraction=1.0,
            max_gap_ms=0.0,
        )

    duration_sec = duration_us / 1_000_000.0
    measured_hz = round((n - 1) / duration_sec, 2)

    # 2. Timing and gap checks
    max_gap_us = 0
    timestamp_inversion = False
    dropped_samples = 0

    for i in range(1, n):
        dt_us = samples[i].t_us - samples[i - 1].t_us
        if dt_us <= 0:
            timestamp_inversion = True
        if dt_us > max_gap_us:
            max_gap_us = dt_us

        # Sequence gap check
        d_seq = samples[i].seq - samples[i - 1].seq
        if d_seq > 1:
            dropped_samples += d_seq - 1

    max_gap_ms = round(max_gap_us / 1000.0, 2)
    total_expected = n + dropped_samples
    missing_fraction = round(dropped_samples / total_expected, 4) if total_expected > 0 else 0.0

    if timestamp_inversion:
        reasons.append("timestamp_inversion")
    if max_gap_ms > max_gap_ms_threshold:
        reasons.append("gap_exceeded")
    if missing_fraction > 0.15:
        reasons.append("high_packet_loss")

    # 3. Hardware validity & saturation
    has_invalid_sample = any(not s.valid for s in samples)
    if has_invalid_sample:
        reasons.append("sensor_read_error")

    has_saturation = any(
        s.saturated or any(abs(axis) >= (range_g * 0.99) for axis in s.a_g)
        for s in samples
    )
    if has_saturation:
        reasons.append("sensor_saturation")

    # 4. Measured sample rate jitter
    if expected_odr_hz > 0:
        odr_error = abs(measured_hz - expected_odr_hz) / expected_odr_hz
        if odr_error > 0.20:
            reasons.append("sample_rate_jitter")

    # 5. Classify state
    fatal_errors = {
        "insufficient_samples",
        "timestamp_inversion",
        "gap_exceeded",
        "zero_or_negative_duration",
        "sensor_read_error",
    }
    if any(r in fatal_errors for r in reasons):
        state = "invalid"
    elif missing_fraction > 0.0 or "sample_rate_jitter" in reasons:
        state = "degraded"
    else:
        state = "good"

    return WindowQuality(
        state=state,
        reasons=reasons,
        measured_hz=measured_hz,
        missing_fraction=missing_fraction,
        max_gap_ms=max_gap_ms,
    )
