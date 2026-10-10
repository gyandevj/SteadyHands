"""Stationary sensor baseline calibration and gravity estimation."""

import math
from typing import List
from .models import SensorSample, SensorCapability, CalibrationResult


def calibrate_stationary(
    samples: List[SensorSample],
    capability: SensorCapability,
) -> CalibrationResult:
    """Computes static gravitational vector and baseline noise floor from resting samples.

    Acceptance rules:
    - Minimum 64 samples spanning >= 800 ms.
    - Zero dropped or invalid packets.
    - Resulting mean gravity magnitude in [0.85g, 1.15g].
    - Noise standard deviation <= 0.05g.
    """
    reasons: List[str] = []

    if not samples or len(samples) < 64:
        return CalibrationResult(
            state="rejected",
            reasons=["insufficient_samples"],
            bias_g=(0.0, 0.0, 0.0),
            noise_std_g=0.0,
            sample_count=len(samples) if samples else 0,
            duration_ms=0.0,
        )

    duration_us = samples[-1].t_us - samples[0].t_us
    duration_ms = round(duration_us / 1000.0, 2)
    if duration_ms < 800.0:
        reasons.append("duration_too_short")

    if any(not s.valid for s in samples):
        reasons.append("sensor_read_error")
    if any(s.saturated for s in samples):
        reasons.append("sensor_saturation")

    n = len(samples)
    ax_vals = [s.a_g[0] for s in samples]
    ay_vals = [s.a_g[1] for s in samples]
    az_vals = [s.a_g[2] for s in samples]

    mean_x = sum(ax_vals) / n
    mean_y = sum(ay_vals) / n
    mean_z = sum(az_vals) / n

    grav_magnitude = math.sqrt(mean_x * mean_x + mean_y * mean_y + mean_z * mean_z)
    if grav_magnitude < 0.85 or grav_magnitude > 1.15:
        reasons.append("invalid_gravity_magnitude")

    var_x = sum((x - mean_x) ** 2 for x in ax_vals) / n
    var_y = sum((y - mean_y) ** 2 for y in ay_vals) / n
    var_z = sum((z - mean_z) ** 2 for z in az_vals) / n

    total_noise_std = round(math.sqrt(var_x + var_y + var_z), 4)

    if total_noise_std > 0.05:
        reasons.append("excessive_motion_during_stationary_phase")

    state = "rejected" if reasons else "complete"

    return CalibrationResult(
        state=state,
        reasons=reasons,
        bias_g=(round(mean_x, 4), round(mean_y, 4), round(mean_z, 4)),
        noise_std_g=total_noise_std,
        sample_count=n,
        duration_ms=duration_ms,
    )
