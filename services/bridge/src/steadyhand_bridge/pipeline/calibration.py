"""Calibration session coordinator integrating with steadyhand_signal."""

import uuid
from typing import Optional, Dict, Any, List
from ..contracts import (
    CalibrationState,
    CalibrationResult,
    WindowQuality,
    SensorCapability as WireCapability,
)
from .buffers import BoundedSampleBuffer
from .analysis_runner import _SIGNAL_LIB, _ANALYSIS_AVAILABLE


class CalibrationCoordinator:
    """Manages stationary baseline calibration sessions."""

    def __init__(self, buffer: BoundedSampleBuffer, capability: Optional[WireCapability] = None):
        self.buffer = buffer
        self.capability = capability
        self._sessions: Dict[str, CalibrationState] = {}
        self._request_to_session: Dict[str, str] = {}

    def start_session(self, phase: str, request_id: str) -> str:
        """Start a calibration session, returning session_id. Idempotent per request_id."""
        if request_id in self._request_to_session:
            return self._request_to_session[request_id]

        session_id = f"calib-{uuid.uuid4().hex[:8]}"
        self._request_to_session[request_id] = session_id

        self._sessions[session_id] = CalibrationState(
            v=1,
            type="calibration.state",
            session_id=session_id,
            phase=phase if phase in ("stationary", "intentional") else "stationary",  # type: ignore[arg-type]
            state="collecting",
            progress=0.1,
            quality=WindowQuality(
                state="good",
                reasons=[],
                measured_hz=100.0,
                missing_fraction=0.0,
                max_gap_ms=10.0,
            ),
            result=None,
        )
        return session_id

    def get_state(self, session_id: str) -> Optional[CalibrationState]:
        return self._sessions.get(session_id)

    def finish_session(self, session_id: str) -> CalibrationResult:
        """Finish calibration and compute baseline using Dedeepya's calibrate_stationary."""
        state = self._sessions.get(session_id)
        if not state:
            raise KeyError(f"Unknown calibration session: {session_id}")

        # Check if algorithm is available
        if not _ANALYSIS_AVAILABLE or _SIGNAL_LIB is None:
            rejected_res = CalibrationResult(
                state="rejected",
                reasons=["analysis_library_unavailable"],
                bias_g=(0.0, 0.0, 1.0),
                noise_std_g=0.0,
                sample_count=0,
                duration_ms=0.0,
            )
            self._sessions[session_id] = CalibrationState(
                v=1,
                type="calibration.state",
                session_id=session_id,
                phase=state.phase,
                state="rejected",
                progress=1.0,
                quality=state.quality,
                result=rejected_res,
            )
            return rejected_res

        # Pull samples for stationary calibration (need >= 64 samples)
        samples = self.buffer.get_latest(100)
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

        cap = _SIGNAL_LIB.SensorCapability(
            model=self.capability.model if self.capability else "generic",
            bus=self.capability.bus if self.capability else "Wire",
            address_hex=self.capability.address_hex if self.capability else "0x19",
            odr_hz=self.capability.odr_hz if self.capability else 100.0,
            range_g=self.capability.range_g if self.capability else 2.0,
        )

        res = _SIGNAL_LIB.calibrate_stationary(sig_samples, cap)

        wire_result = CalibrationResult(
            state=res.state,
            reasons=list(res.reasons),
            bias_g=res.bias_g,
            noise_std_g=round(res.noise_std_g, 4),
            sample_count=res.sample_count,
            duration_ms=round(res.duration_ms, 2),
        )

        final_state = "complete" if res.state == "complete" else "rejected"
        self._sessions[session_id] = CalibrationState(
            v=1,
            type="calibration.state",
            session_id=session_id,
            phase=state.phase,
            state=final_state,
            progress=1.0,
            quality=state.quality,
            result=wire_result,
        )

        return wire_result
