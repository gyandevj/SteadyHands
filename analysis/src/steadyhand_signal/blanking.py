"""Haptic artifact exclusion and mechanical settling blanking."""

from typing import List, Optional, Tuple
from .models import SensorSample


def is_haptic_blanking_active(
    samples: List[SensorSample],
    last_haptic_pulse_end_us: Optional[int] = None,
    settling_cooldown_us: int = 500_000,
) -> Tuple[bool, List[str]]:
    """Determines whether a sensor window must be discarded due to motor activity.

    Criteria:
    1. Any sample in the window has haptic_active == True (active pulse).
    2. Window start time is within settling_cooldown_us (500 ms) of last motor pulse end.
    """
    if not samples:
        return (False, [])

    # 1. Direct actuator pulse flag
    if any(s.haptic_active for s in samples):
        return (True, ["actuator_pulse_overlap"])

    # 2. Post-pulse settling cooldown
    if last_haptic_pulse_end_us is not None:
        window_start_us = samples[0].t_us
        if window_start_us < (last_haptic_pulse_end_us + settling_cooldown_us):
            return (True, ["post_haptic_settling_window"])

    return (False, [])
