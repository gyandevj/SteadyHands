"""Per-axis detrending, Hann windowing, and one-sided PSD computation."""

import math
from typing import List, Tuple


def compute_axis_psd(
    data: List[float],
    fs: float,
) -> Tuple[List[float], List[float]]:
    """Computes one-sided Power Spectral Density (PSD) for a 1D real series.

    Applies:
    1. Mean subtraction (detrending)
    2. Periodic Hann window
    3. Normalization: 2 / (fs * S2) where S2 = sum(w^2)

    Returns:
        (frequencies_hz, psd_g2_per_hz)
    """
    n = len(data)
    if n < 4 or fs <= 0:
        return ([], [])

    # 1. Mean subtraction
    mean_val = sum(data) / n
    detrended = [x - mean_val for x in data]

    # 2. Hann window weights and power sum
    hann_weights = [
        0.5 * (1.0 - math.cos(2.0 * math.pi * k / (n - 1)))
        for k in range(n)
    ]
    s2 = sum(w * w for w in hann_weights)
    if s2 <= 0:
        return ([], [])

    windowed = [detrended[k] * hann_weights[k] for k in range(n)]

    # 3. Discrete Fourier Transform (one-sided)
    num_bins = n // 2 + 1
    freqs: List[float] = [round(m * fs / n, 4) for m in range(num_bins)]
    psd: List[float] = []

    for m in range(num_bins):
        # Angle step
        omega = 2.0 * math.pi * m / n
        re = 0.0
        im = 0.0
        for k in range(n):
            angle = omega * k
            re += windowed[k] * math.cos(angle)
            im -= windowed[k] * math.sin(angle)

        mag_sq = re * re + im * im

        # One-sided scaling factor
        if m == 0 or (n % 2 == 0 and m == num_bins - 1):
            scale = 1.0 / (fs * s2)
        else:
            scale = 2.0 / (fs * s2)

        psd.append(mag_sq * scale)

    return (freqs, psd)


def compute_summed_psd(
    ax: List[float],
    ay: List[float],
    az: List[float],
    fs: float,
) -> Tuple[List[float], List[float]]:
    """Computes summed one-sided PSD across all three spatial axes.

    Returns:
        (frequencies_hz, summed_psd_g2_per_hz)
    """
    freqs, psd_x = compute_axis_psd(ax, fs)
    _, psd_y = compute_axis_psd(ay, fs)
    _, psd_z = compute_axis_psd(az, fs)

    summed_psd = [
        psd_x[i] + psd_y[i] + psd_z[i]
        for i in range(len(freqs))
    ]

    return (freqs, summed_psd)
