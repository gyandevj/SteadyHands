"""Feature extraction from Power Spectral Density."""

import math
from typing import List, Optional
from .models import MotionFeatures


def extract_features(
    freqs: List[float],
    psd_sum: List[float],
    band_min_hz: float = 3.0,
    band_max_hz: float = 12.0,
) -> MotionFeatures:
    """Extracts physical tremor/motion features from 3-axis summed PSD.

    Parameters:
    - freqs: Frequency bins (Hz)
    - psd_sum: Summed one-sided PSD (g^2 / Hz)
    - band_min_hz: Lower bound of target tremor band (default 3.0 Hz)
    - band_max_hz: Upper bound of target tremor band (default 12.0 Hz)

    Returns:
    - MotionFeatures dataclass
    """
    if not freqs or not psd_sum or len(freqs) != len(psd_sum) or len(freqs) < 2:
        return MotionFeatures(
            status="unknown",
            dominant_hz=None,
            band_rms_g=None,
            band_power_ratio=None,
            peak_concentration=None,
        )

    df = freqs[1] - freqs[0]
    if df <= 0:
        return MotionFeatures(
            status="unknown",
            dominant_hz=None,
            band_rms_g=None,
            band_power_ratio=None,
            peak_concentration=None,
        )

    # 1. Total power above 0.5 Hz (excluding DC drift)
    total_power = sum(
        psd_sum[i] * df
        for i in range(len(freqs))
        if freqs[i] >= 0.5
    )

    # 2. Band power in [band_min_hz, band_max_hz]
    band_indices = [
        i for i in range(len(freqs))
        if band_min_hz <= freqs[i] <= band_max_hz
    ]

    if not band_indices:
        return MotionFeatures(
            status="unknown",
            dominant_hz=None,
            band_rms_g=0.0,
            band_power_ratio=0.0,
            peak_concentration=0.0,
        )

    band_power = sum(psd_sum[i] * df for i in band_indices)
    band_rms_g = round(math.sqrt(max(0.0, band_power)), 4)
    band_power_ratio = round(min(1.0, band_power / total_power), 4) if total_power > 1e-12 else 0.0

    # 3. Dominant frequency via peak search in band
    peak_idx = max(band_indices, key=lambda i: psd_sum[i])
    y0 = psd_sum[peak_idx]

    # Parabolic sub-bin interpolation
    dominant_hz = freqs[peak_idx]
    if 0 < peak_idx < len(psd_sum) - 1:
        y_prev = psd_sum[peak_idx - 1]
        y_next = psd_sum[peak_idx + 1]
        denom = y_prev - 2.0 * y0 + y_next
        if abs(denom) > 1e-12:
            delta = 0.5 * (y_prev - y_next) / denom
            if -1.0 <= delta <= 1.0:
                dominant_hz = freqs[peak_idx] + delta * df

    dominant_hz = round(dominant_hz, 2)

    # 4. Spectral peak concentration (power in peak bin +- 1 bin / band power)
    peak_window_indices = {peak_idx}
    if peak_idx > 0:
        peak_window_indices.add(peak_idx - 1)
    if peak_idx < len(psd_sum) - 1:
        peak_window_indices.add(peak_idx + 1)

    peak_window_power = sum(psd_sum[i] * df for i in peak_window_indices)
    peak_concentration = (
        round(min(1.0, peak_window_power / band_power), 4)
        if band_power > 1e-12
        else 0.0
    )

    return MotionFeatures(
        status="unknown",  # to be classified by state classifier
        dominant_hz=dominant_hz,
        band_rms_g=band_rms_g,
        band_power_ratio=band_power_ratio,
        peak_concentration=peak_concentration,
    )
