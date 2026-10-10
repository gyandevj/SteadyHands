"""Domain models and dataclasses for steadyhand_signal.

Conforms strictly to docs/contracts.md (Version 1).
Contains zero external dependencies; pure standard library.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Literal


@dataclass(frozen=True)
class SensorSample:
    """Individual 3-axis accelerometer sample from hardware or synthetic stream."""
    seq: int
    t_us: int
    a_g: Tuple[float, float, float]
    valid: bool
    saturated: bool
    haptic_active: bool


@dataclass(frozen=True)
class SensorCapability:
    """Sensor hardware capability descriptor."""
    model: str
    bus: str
    address_hex: str
    odr_hz: float
    range_g: float
    units: str = "g"
    resolution_bits: int = 12
    haptics: bool = False


@dataclass(frozen=True)
class CalibrationResult:
    """Outcome of stationary baseline calibration."""
    state: Literal["complete", "rejected"]
    reasons: List[str]
    bias_g: Tuple[float, float, float]
    noise_std_g: float
    sample_count: int
    duration_ms: float


@dataclass(frozen=True)
class WindowQuality:
    """Data quality and integrity status of an evaluated sensor window."""
    state: Literal["good", "degraded", "invalid", "haptic_blanking"]
    reasons: List[str]
    measured_hz: float
    missing_fraction: float
    max_gap_ms: float


@dataclass(frozen=True)
class MotionFeatures:
    """Spectral and physical motion features extracted from sensor window."""
    status: Literal["unknown", "quiet", "periodic_motion", "broadband_motion"]
    dominant_hz: Optional[float]
    band_rms_g: Optional[float]
    band_power_ratio: Optional[float]
    peak_concentration: Optional[float]


@dataclass(frozen=True)
class AdvisoryRecommendation:
    """Assistance preset recommendation formulated from detected motion."""
    id: str
    preset: Literal["light", "steady"]
    requires_user_acceptance: bool
    reason_code: str


@dataclass(frozen=True)
class MotionResult:
    """Complete analysis output frame returned by analyze_window."""
    quality: WindowQuality
    motion: MotionFeatures
    recommendation: Optional[AdvisoryRecommendation]
