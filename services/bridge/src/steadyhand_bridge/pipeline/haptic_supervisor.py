"""Haptic actuator supervisor enforcing safety bounds, cooldown, and spectral blanking."""

import time
from collections import deque
from typing import Optional, Tuple
from ..contracts import HapticRequest, HapticAck, HapticPulse


class HapticSupervisor:
    """Supervises optional haptic feedback with strict hardware safety invariants."""

    def __init__(self, enabled: bool = False, cooldown_ms: int = 1000):
        self.enabled = enabled
        self.cooldown_s = cooldown_ms / 1000.0

        self._last_pulse_end_monotonic = 0.0
        self._recent_command_ids: deque[str] = deque(maxlen=64)

    def request_pulse(self, req: HapticRequest) -> Tuple[HapticAck, Optional[HapticPulse]]:
        """Validate and queue a haptic pulse request.
        
        Returns:
            (ack: HapticAck, pulse: Optional[HapticPulse])
        """
        if not self.enabled:
            return (
                HapticAck(
                    v=1,
                    type="haptic.ack",
                    command_id=req.command_id,
                    accepted=False,
                    reason="Haptics disabled or hardware actuator unsupported",
                ),
                None,
            )

        # Bounds check (1-80 ms)
        if req.duration_ms < 1 or req.duration_ms > 80:
            return (
                HapticAck(
                    v=1,
                    type="haptic.ack",
                    command_id=req.command_id,
                    accepted=False,
                    reason=f"Duration {req.duration_ms} ms outside allowed bounds [1, 80] ms",
                ),
                None,
            )

        # Deduplication check (last 64 IDs)
        if req.command_id in self._recent_command_ids:
            return (
                HapticAck(
                    v=1,
                    type="haptic.ack",
                    command_id=req.command_id,
                    accepted=False,
                    reason="Duplicate command_id within current session window",
                ),
                None,
            )

        # Cooldown check
        now = time.monotonic()
        if (now - self._last_pulse_end_monotonic) < self.cooldown_s:
            return (
                HapticAck(
                    v=1,
                    type="haptic.ack",
                    command_id=req.command_id,
                    accepted=False,
                    reason="Haptic cooldown active (minimum 1000 ms between pulses)",
                ),
                None,
            )

        # Accept pulse
        self._recent_command_ids.append(req.command_id)
        pulse_start_us = int(now * 1_000_000)
        pulse_end_us = pulse_start_us + (req.duration_ms * 1000)
        self._last_pulse_end_monotonic = now + (req.duration_ms / 1000.0)

        ack = HapticAck(
            v=1,
            type="haptic.ack",
            command_id=req.command_id,
            accepted=True,
        )
        pulse = HapticPulse(
            v=1,
            type="haptic.pulse",
            command_id=req.command_id,
            mcu_start_us=pulse_start_us,
            mcu_end_us=pulse_end_us,
        )
        return ack, pulse
