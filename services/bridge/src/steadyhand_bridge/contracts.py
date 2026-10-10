"""Canonical SteadyHand contracts and wire models in Python.

Conforms strictly to docs/contracts.md (Version 1) and packages/contracts/.
Uses Pydantic v2 for strict boundary validation.
"""

from typing import List, Literal, Optional, Tuple, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator


DataSource = Literal["live", "recorded", "synthetic", "unavailable"]
QualityState = Literal[
    "warming_up",
    "good",
    "degraded",
    "stale",
    "haptic_blanking",
    "unavailable",
]
MotionStatus = Literal["quiet", "periodic_motion", "other_motion", "unknown"]
PointerMode = Literal["native", "stabilized", "raw_virtual"]
FilterKind = Literal["exponential", "one_euro"]


# Assistance Configuration
class FilterConfig(BaseModel):
    kind: FilterKind
    min_cutoff_hz: float = Field(ge=0.1, le=20.0)
    beta: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    derivative_cutoff_hz: Optional[float] = Field(default=None, ge=0.1, le=20.0)


class TargetConfig(BaseModel):
    capture_radius_px: float = Field(ge=0.0, le=48.0)
    ambiguity_margin_px: float = Field(ge=0.0, le=24.0)


class DwellConfig(BaseModel):
    enabled: bool
    duration_ms: float = Field(ge=100.0, le=3000.0)
    rearm_ms: float = Field(ge=50.0, le=2000.0)


class AssistanceConfig(BaseModel):
    v: Literal[1] = 1
    revision: int = Field(ge=0)
    mode: PointerMode
    filter: FilterConfig
    target: TargetConfig
    dwell: DwellConfig
    haptics_enabled: bool = False
    show_raw_pointer: bool = False


# Device & Sensor Models
class SensorCapability(BaseModel):
    model: str = Field(min_length=1)
    bus: str = Field(min_length=1)
    address_hex: str = Field(min_length=1)
    odr_hz: float = Field(ge=1.0, le=1000.0)
    range_g: float = Field(ge=0.5, le=32.0)
    units: str = "g"
    resolution_bits: Optional[int] = Field(default=None, ge=6, le=24)
    haptics: Optional[bool] = None


class DeviceCapabilities(BaseModel):
    haptics: bool = False


class DeviceHello(BaseModel):
    v: Literal[1] = 1
    type: Literal["device.hello"] = "device.hello"
    source: DataSource
    boot_id: str = Field(min_length=1)
    stream_id: str = Field(min_length=1)
    sensor: SensorCapability
    capabilities: DeviceCapabilities


class SensorSample(BaseModel):
    seq: int = Field(ge=0)
    t_us: int = Field(ge=0)
    a_g: Tuple[float, float, float]
    valid: bool
    saturated: bool
    haptic_active: bool

    @field_validator("a_g")
    @classmethod
    def validate_finite(cls, v: Tuple[float, float, float]) -> Tuple[float, float, float]:
        for val in v:
            if not isinstance(val, (int, float)) or val != val:  # NaN check
                raise ValueError("a_g values must be finite numbers")
        return v


class BatchCounters(BaseModel):
    i2c_errors: int = Field(ge=0, default=0)
    dropped_samples: int = Field(ge=0, default=0)
    queue_overflows: int = Field(ge=0, default=0)


class SensorBatch(BaseModel):
    v: Literal[1] = 1
    type: Literal["sensor.batch"] = "sensor.batch"
    source: DataSource
    boot_id: str = Field(min_length=1)
    stream_id: str = Field(min_length=1)
    batch_seq: int = Field(ge=0)
    samples: List[SensorSample] = Field(max_length=50)
    counters: BatchCounters


class WindowMetrics(BaseModel):
    start_us: int = Field(ge=0)
    end_us: int = Field(ge=0)
    fresh_samples: int = Field(ge=0)

    @model_validator(mode="after")
    def check_monotonic_window(self) -> "WindowMetrics":
        if self.end_us < self.start_us:
            raise ValueError("end_us must be >= start_us")
        return self


class WindowQuality(BaseModel):
    state: QualityState
    reasons: List[str] = Field(default_factory=list)
    measured_hz: float = Field(ge=0.0)
    missing_fraction: float = Field(ge=0.0, le=1.0)
    max_gap_ms: float = Field(ge=0.0)


class MotionFeatures(BaseModel):
    status: MotionStatus
    dominant_hz: Optional[float] = Field(default=None, ge=0.0, le=50.0)
    band_rms_g: Optional[float] = Field(default=None, ge=0.0)
    band_power_ratio: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    peak_concentration: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class AdvisoryRecommendation(BaseModel):
    id: str = Field(min_length=1)
    preset: Literal["light", "steady"]
    requires_user_acceptance: bool = True
    reason_code: str = Field(min_length=1)


class MotionFrame(BaseModel):
    v: Literal[1] = 1
    type: Literal["motion.frame"] = "motion.frame"
    source: DataSource
    boot_id: str = Field(min_length=1)
    stream_id: str = Field(min_length=1)
    frame_seq: int = Field(ge=0)
    window: WindowMetrics
    quality: WindowQuality
    motion: MotionFeatures
    recommendation: Optional[AdvisoryRecommendation] = None


class DeviceHealth(BaseModel):
    v: Literal[1] = 1
    type: Literal["device.health"] = "device.health"
    source: DataSource
    uptime_s: float = Field(ge=0.0)
    sample_rate_hz: float = Field(ge=0.0)
    total_samples: int = Field(ge=0)
    dropped_samples: int = Field(ge=0)
    queue_overflows: int = Field(ge=0)
    is_stale: bool = False
    last_sample_t_us: Optional[int] = None


class CalibrationResult(BaseModel):
    state: Literal["complete", "rejected"]
    reasons: List[str] = Field(default_factory=list)
    bias_g: Tuple[float, float, float]
    noise_std_g: float = Field(ge=0.0)
    sample_count: int = Field(ge=0)
    duration_ms: float = Field(ge=0.0)


class CalibrationState(BaseModel):
    v: Literal[1] = 1
    type: Literal["calibration.state"] = "calibration.state"
    session_id: str = Field(min_length=1)
    phase: Literal["stationary", "intentional"]
    state: Literal["idle", "collecting", "complete", "rejected"]
    progress: float = Field(ge=0.0, le=1.0)
    quality: WindowQuality
    result: Optional[CalibrationResult] = None


class HapticRequest(BaseModel):
    v: Literal[1] = 1
    type: Literal["haptic.request"] = "haptic.request"
    command_id: str = Field(min_length=1)
    duration_ms: int = Field(ge=1, le=80)
    reason: str = Field(min_length=1)


class HapticAck(BaseModel):
    v: Literal[1] = 1
    type: Literal["haptic.ack"] = "haptic.ack"
    command_id: str
    accepted: bool
    reason: Optional[str] = None


class HapticPulse(BaseModel):
    v: Literal[1] = 1
    type: Literal["haptic.pulse"] = "haptic.pulse"
    command_id: str
    mcu_start_us: int = Field(ge=0)
    mcu_end_us: int = Field(ge=0)


# WebSocket Wire Envelopes
class ClientAuth(BaseModel):
    v: Literal[1] = 1
    type: Literal["client.auth"] = "client.auth"
    request_id: str
    token: str
    role: Optional[Literal["extension", "dashboard"]] = None


class ClientPing(BaseModel):
    v: Literal[1] = 1
    type: Literal["client.ping"] = "client.ping"
    request_id: str
    timestamp_ms: int


class ServerPong(BaseModel):
    v: Literal[1] = 1
    type: Literal["server.pong"] = "server.pong"
    request_id: str
    timestamp_ms: int


class StateSnapshot(BaseModel):
    v: Literal[1] = 1
    type: Literal["state.snapshot"] = "state.snapshot"
    request_id: str
    device: Optional[DeviceHello] = None
    health: DeviceHealth
    latest_frame: Optional[MotionFrame] = None


class CommandError(BaseModel):
    v: Literal[1] = 1
    type: Literal["command.error"] = "command.error"
    request_id: str
    code: str
    message: str


# Session Task Events (Section 8)
class SessionTaskEvent(BaseModel):
    event_id: str = Field(min_length=1)
    task_id: str = Field(min_length=1)
    t_monotonic_ms: float = Field(ge=0.0)
    config_revision: int = Field(ge=0)
    source: DataSource
    kind: Literal[
        "task.started",
        "task.completed",
        "task.timeout",
        "selection.dispatched",
        "selection.corrected",
    ]
    details: Optional[Dict[str, Any]] = None
