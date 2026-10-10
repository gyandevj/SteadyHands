"""Motion state classification and advisory recommendation generation."""

from typing import Optional, Literal
from .models import (
    MotionFeatures,
    CalibrationResult,
    AdvisoryRecommendation,
)


def classify_motion(
    features: MotionFeatures,
    calibration: Optional[CalibrationResult] = None,
) -> Literal["quiet", "periodic_motion", "broadband_motion", "unknown"]:
    """Classifies physical motion state based on spectral features.

    States:
    - 'quiet': Acceleration within baseline noise floor.
    - 'periodic_motion': Narrowband concentration in 3-12 Hz tremor band.
    - 'broadband_motion': Wide-spectrum or erratic voluntary movement.
    - 'unknown': Quality degraded or insufficient samples.
    """
    if features.band_rms_g is None:
        return "unknown"

    # Baseline threshold adaptation
    if calibration and calibration.state == "complete":
        noise_threshold = max(0.015, calibration.noise_std_g * 3.0)
    else:
        noise_threshold = 0.015

    # 1. Quiet state
    if features.band_rms_g < noise_threshold:
        return "quiet"

    # 2. Narrowband periodic motion criteria
    band_ratio = features.band_power_ratio or 0.0
    concentration = features.peak_concentration or 0.0
    dominant_hz = features.dominant_hz or 0.0

    if (
        features.band_rms_g >= noise_threshold
        and band_ratio >= 0.40
        and concentration >= 0.35
        and 3.0 <= dominant_hz <= 12.0
    ):
        return "periodic_motion"

    # 3. Broadband/diffuse motion
    return "broadband_motion"


def generate_recommendation(
    features: MotionFeatures,
    status: str,
    rec_id: str = "rec-1",
) -> Optional[AdvisoryRecommendation]:
    """Generates an advisory preset recommendation if persistent motion is observed.

    Returns None if motion is quiet, broadband, or unknown.
    """
    if status != "periodic_motion" or features.dominant_hz is None:
        return None

    if 3.0 <= features.dominant_hz <= 6.5:
        return AdvisoryRecommendation(
            id=rec_id,
            preset="steady",
            requires_user_acceptance=True,
            reason_code="persistent_motion_during_task",
        )
    else:
        return AdvisoryRecommendation(
            id=rec_id,
            preset="light",
            requires_user_acceptance=True,
            reason_code="fine_oscillation_detected",
        )
