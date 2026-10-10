"""Monotonic timestamp uniform grid resampling."""

from typing import List, Tuple
from .models import SensorSample


def resample_to_grid(
    samples: List[SensorSample],
    target_fs: float = 100.0,
) -> Tuple[List[float], List[float], List[float], List[float]]:
    """Resamples non-uniformly sampled 3-axis accelerometer data to a uniform time grid.

    Returns:
        (t_grid, ax_grid, ay_grid, az_grid)
    """
    if not samples or len(samples) < 2:
        return ([], [], [], [])

    t0_us = samples[0].t_us
    t_sec = [(s.t_us - t0_us) / 1_000_000.0 for s in samples]
    raw_ax = [s.a_g[0] for s in samples]
    raw_ay = [s.a_g[1] for s in samples]
    raw_az = [s.a_g[2] for s in samples]

    duration = t_sec[-1]
    if duration <= 0 or target_fs <= 0:
        return ([], [], [], [])

    dt_grid = 1.0 / target_fs
    num_grid = int(duration * target_fs) + 1

    t_grid: List[float] = [round(i * dt_grid, 6) for i in range(num_grid)]
    ax_grid: List[float] = []
    ay_grid: List[float] = []
    az_grid: List[float] = []

    k = 0
    n = len(t_sec)

    for tg in t_grid:
        # Advance index k until t_sec[k+1] >= tg
        while k < n - 2 and t_sec[k + 1] < tg:
            k += 1

        dt_segment = t_sec[k + 1] - t_sec[k]
        if dt_segment <= 0:
            frac = 0.0
        else:
            frac = max(0.0, min(1.0, (tg - t_sec[k]) / dt_segment))

        interp_x = raw_ax[k] + frac * (raw_ax[k + 1] - raw_ax[k])
        interp_y = raw_ay[k] + frac * (raw_ay[k + 1] - raw_ay[k])
        interp_z = raw_az[k] + frac * (raw_az[k + 1] - raw_az[k])

        ax_grid.append(interp_x)
        ay_grid.append(interp_y)
        az_grid.append(interp_z)

    return (t_grid, ax_grid, ay_grid, az_grid)
