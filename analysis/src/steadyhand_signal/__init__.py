"""steadyhand_signal: Pure Python sensor signal processing for SteadyHand.

Conforms strictly to docs/contracts.md (Version 1).
Pure numerical algorithms with zero device I/O or server dependencies.
"""

from typing import List, Optional

from .models import (
    SensorSample,
    SensorCapability,
    CalibrationResult,
    WindowQuality,
    MotionFeatures,
    AdvisoryRecommendation,
    MotionResult,
)
from .validation import validate_window
from .resampler import resample_to_grid
from .spectral import compute_axis_psd, compute_summed_psd
from .features import extract_features
from .state import classify_motion, generate_recommendation
from .calibration import calibrate_stationary
from .blanking import is_haptic_blanking_active


def analyze_window(
    samples: List[SensorSample],
    calibration: Optional[CalibrationResult] = None,
    capability: Optional[SensorCapability] = None,
    last_haptic_pulse_end_us: Optional[int] = None,
) -> MotionResult:
    """Bounded, pure sensor window analysis for streaming tremor detection.

    Steps:
    1. Check haptic pulse overlap and settling blanking interval.
    2. Validate sample timestamps, gaps, sequence drops, and saturation.
    3. Resample non-uniform samples to uniform grid.
    4. Detrend, apply Hann window, and compute summed one-sided PSD.
    5. Extract 3-12 Hz band RMS, dominant frequency, and peak concentration.
    6. Classify motion state (quiet, periodic_motion, broadband_motion, unknown).
    7. Generate advisory preset recommendation if periodic motion is observed.
    """
    cap = capability or SensorCapability(
        model="generic",
        bus="I2C",
        address_hex="0x00",
        odr_hz=100.0,
        range_g=2.0,
    )

    # 1. Haptic blanking check
    is_blanked, blank_reasons = is_haptic_blanking_active(
        samples, last_haptic_pulse_end_us=last_haptic_pulse_end_us
    )
    if is_blanked:
        return MotionResult(
            quality=WindowQuality(
                state="haptic_blanking",
                reasons=blank_reasons,
                measured_hz=0.0,
                missing_fraction=0.0,
                max_gap_ms=0.0,
            ),
            motion=MotionFeatures(
                status="unknown",
                dominant_hz=None,
                band_rms_g=None,
                band_power_ratio=None,
                peak_concentration=None,
            ),
            recommendation=None,
        )

    # 2. Window validation
    # Allow inter-batch flush gap threshold tuned to hardware ODR (~150 ms for <=64 Hz serial batches, 40 ms for high-rate streams)
    max_gap = 150.0 if (cap.odr_hz and cap.odr_hz <= 64.0) else 40.0
    quality = validate_window(
        samples,
        expected_odr_hz=cap.odr_hz,
        max_gap_ms_threshold=max_gap,
        range_g=cap.range_g,
    )
    if quality.state == "invalid":
        return MotionResult(
            quality=quality,
            motion=MotionFeatures(
                status="unknown",
                dominant_hz=None,
                band_rms_g=None,
                band_power_ratio=None,
                peak_concentration=None,
            ),
            recommendation=None,
        )

    # 3. Resample to uniform grid
    t_grid, ax, ay, az = resample_to_grid(samples, target_fs=cap.odr_hz)
    if len(t_grid) < 16:
        return MotionResult(
            quality=quality,
            motion=MotionFeatures(
                status="unknown",
                dominant_hz=None,
                band_rms_g=None,
                band_power_ratio=None,
                peak_concentration=None,
            ),
            recommendation=None,
        )

    # 4. Spectral analysis
    freqs, psd_sum = compute_summed_psd(ax, ay, az, fs=cap.odr_hz)

    # 5. Extract spectral features
    features = extract_features(freqs, psd_sum)

    # 6. Classify motion status
    status = classify_motion(features, calibration)
    classified_features = MotionFeatures(
        status=status,
        dominant_hz=features.dominant_hz,
        band_rms_g=features.band_rms_g,
        band_power_ratio=features.band_power_ratio,
        peak_concentration=features.peak_concentration,
    )

    # 7. Formulate advisory recommendation
    recommendation = generate_recommendation(classified_features, status)

    return MotionResult(
        quality=quality,
        motion=classified_features,
        recommendation=recommendation,
    )


__all__ = [
    "SensorSample",
    "SensorCapability",
    "CalibrationResult",
    "WindowQuality",
    "MotionFeatures",
    "AdvisoryRecommendation",
    "MotionResult",
    "analyze_window",
    "calibrate_stationary",
    "validate_window",
    "resample_to_grid",
    "compute_axis_psd",
    "compute_summed_psd",
    "extract_features",
    "classify_motion",
    "generate_recommendation",
    "is_haptic_blanking_active",
]
