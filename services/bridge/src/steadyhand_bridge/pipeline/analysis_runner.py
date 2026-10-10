"""Integration adapter for Dedeepya's steadyhand_signal analysis library."""

import os
import sys
from pathlib import Path
from typing import List, Optional, Any
from ..contracts import (
    SensorSample as WireSample,
    SensorCapability as WireCapability,
    MotionFrame,
    WindowMetrics,
    WindowQuality,
    MotionFeatures,
    AdvisoryRecommendation,
    DataSource,
    QualityState,
    MotionStatus,
)
from .buffers import BoundedSampleBuffer


# Attempt discovery of Dedeepya's steadyhand_signal library
_SIGNAL_LIB = None
_ANALYSIS_AVAILABLE = False


def _try_import_signal_library() -> bool:
    global _SIGNAL_LIB, _ANALYSIS_AVAILABLE

    # 1. Standard import if already in pythonpath or installed
    try:
        import steadyhand_signal  # type: ignore[import-not-found]
        _SIGNAL_LIB = steadyhand_signal
        _ANALYSIS_AVAILABLE = True
        return True
    except ImportError:
        pass

    # 2. Check candidate search paths
    candidates = []
    env_path = os.environ.get("STEADYHAND_ANALYSIS_PATH")
    if env_path:
        candidates.append(Path(env_path))

    # Repo-relative analysis/src
    repo_root = Path(__file__).resolve().parents[4]
    candidates.append(repo_root / "analysis" / "src")

    # Temp archive from session inspection
    temp_dir = os.environ.get("TEMP", "")
    if temp_dir:
        candidates.append(Path(temp_dir) / "opencode" / "dedeepya-750ba1a" / "analysis" / "src")

    for candidate in candidates:
        if candidate.exists() and (candidate / "steadyhand_signal").exists():
            cand_str = str(candidate)
            if cand_str not in sys.path:
                sys.path.insert(0, cand_str)
            try:
                import steadyhand_signal  # type: ignore[import-not-found]
                _SIGNAL_LIB = steadyhand_signal
                _ANALYSIS_AVAILABLE = True
                return True
            except ImportError:
                continue

    _ANALYSIS_AVAILABLE = False
    return False


# Initialize on module load
_try_import_signal_library()


class AnalysisRunner:
    """Supervises rolling window extraction and signal analysis invocation."""

    def __init__(
        self,
        buffer: BoundedSampleBuffer,
        window_size_samples: int = 200,
        capability: Optional[WireCapability] = None,
    ):
        self.buffer = buffer
        self.window_size_samples = window_size_samples
        self.capability = capability
        self._frame_seq = 0
        self._last_haptic_pulse_end_us: Optional[int] = None
        self._active_calibration: Optional[Any] = None

    def is_available(self) -> bool:
        """Return True if Dedeepya's steadyhand_signal is loaded and available."""
        global _ANALYSIS_AVAILABLE
        if not _ANALYSIS_AVAILABLE:
            _try_import_signal_library()
        return _ANALYSIS_AVAILABLE

    def set_calibration(self, calibration_result: Optional[Any]) -> None:
        """Set the active stationary calibration result."""
        self._active_calibration = calibration_result

    def record_haptic_pulse(self, pulse_end_us: int) -> None:
        """Record the end timestamp of an actuator pulse for spectral blanking."""
        self._last_haptic_pulse_end_us = pulse_end_us

    def run_window(
        self,
        source: DataSource,
        boot_id: str,
        stream_id: str,
        is_stale: bool,
    ) -> MotionFrame:
        """Extract rolling window and evaluate via Dedeepya's analysis pipeline."""
        self._frame_seq += 1
        samples: List[WireSample] = self.buffer.get_latest(self.window_size_samples)

        # Basic window bounds
        if samples:
            start_us = samples[0].t_us
            end_us = samples[-1].t_us
            fresh_samples = len(samples)
        else:
            start_us = 0
            end_us = 0
            fresh_samples = 0

        window = WindowMetrics(
            start_us=start_us,
            end_us=end_us,
            fresh_samples=fresh_samples,
        )

        # If transport is stale, mark stale quality immediately
        if is_stale:
            return MotionFrame(
                v=1,
                type="motion.frame",
                source=source,
                boot_id=boot_id,
                stream_id=stream_id,
                frame_seq=self._frame_seq,
                window=window,
                quality=WindowQuality(
                    state="stale",
                    reasons=["transport_stale"],
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

        # Check if algorithm is available
        if not self.is_available() or _SIGNAL_LIB is None:
            return MotionFrame(
                v=1,
                type="motion.frame",
                source=source,
                boot_id=boot_id,
                stream_id=stream_id,
                frame_seq=self._frame_seq,
                window=window,
                quality=WindowQuality(
                    state="unavailable",
                    reasons=["analysis_unavailable"],
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

        # Warming up check (<32 samples)
        if len(samples) < 32:
            return MotionFrame(
                v=1,
                type="motion.frame",
                source=source,
                boot_id=boot_id,
                stream_id=stream_id,
                frame_seq=self._frame_seq,
                window=window,
                quality=WindowQuality(
                    state="warming_up",
                    reasons=["insufficient_samples"],
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

        # Convert wire samples to Dedeepya's internal dataclasses
        sig_samples = [
            _SIGNAL_LIB.SensorSample(
                seq=s.seq,
                t_us=s.t_us,
                a_g=s.a_g,
                valid=s.valid,
                saturated=s.saturated,
                haptic_active=s.haptic_active,
            )
            for s in samples
        ]

        sig_capability = None
        if self.capability:
            sig_capability = _SIGNAL_LIB.SensorCapability(
                model=self.capability.model,
                bus=self.capability.bus,
                address_hex=self.capability.address_hex,
                odr_hz=self.capability.odr_hz,
                range_g=self.capability.range_g,
                units=self.capability.units,
            )

        # Call Dedeepya's real analyze_window
        result = _SIGNAL_LIB.analyze_window(
            samples=sig_samples,
            calibration=self._active_calibration,
            capability=sig_capability,
            last_haptic_pulse_end_us=self._last_haptic_pulse_end_us,
        )

        # Translate quality states (§2.3)
        q_state: QualityState = "good"
        if result.quality.state == "haptic_blanking":
            q_state = "haptic_blanking"
        elif result.quality.state == "invalid":
            q_state = "degraded"
        elif result.quality.state in ("good", "degraded"):
            q_state = result.quality.state  # type: ignore[assignment]

        quality = WindowQuality(
            state=q_state,
            reasons=list(result.quality.reasons),
            measured_hz=result.quality.measured_hz,
            missing_fraction=result.quality.missing_fraction,
            max_gap_ms=result.quality.max_gap_ms,
        )

        # Translate motion status (§2.3: broadband_motion -> other_motion)
        m_status: MotionStatus = "unknown"
        if result.motion.status == "broadband_motion":
            m_status = "other_motion"
        elif result.motion.status in ("quiet", "periodic_motion", "unknown"):
            m_status = result.motion.status  # type: ignore[assignment]

        motion = MotionFeatures(
            status=m_status,
            dominant_hz=result.motion.dominant_hz,
            band_rms_g=result.motion.band_rms_g,
            band_power_ratio=result.motion.band_power_ratio,
            peak_concentration=result.motion.peak_concentration,
        )

        recommendation = None
        if result.recommendation:
            recommendation = AdvisoryRecommendation(
                id=result.recommendation.id,
                preset=result.recommendation.preset,
                requires_user_acceptance=result.recommendation.requires_user_acceptance,
                reason_code=result.recommendation.reason_code,
            )

        return MotionFrame(
            v=1,
            type="motion.frame",
            source=source,
            boot_id=boot_id,
            stream_id=stream_id,
            frame_seq=self._frame_seq,
            window=window,
            quality=quality,
            motion=motion,
            recommendation=recommendation,
        )
