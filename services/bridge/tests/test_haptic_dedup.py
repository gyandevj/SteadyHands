"""Haptic supervisor safety, bounds, cooldown, and deduplication tests."""

import pytest
from steadyhand_bridge.pipeline.haptic_supervisor import HapticSupervisor
from steadyhand_bridge.contracts import HapticRequest


def test_haptics_disabled_by_default():
    supervisor = HapticSupervisor(enabled=False)
    ack, pulse = supervisor.request_pulse(
        HapticRequest(v=1, type="haptic.request", command_id="c1", duration_ms=40, reason="test")
    )
    assert ack.accepted is False
    assert pulse is None


def test_haptics_bounds_enforced():
    supervisor = HapticSupervisor(enabled=True)

    # Below 1 ms
    with pytest.raises(Exception):
        HapticRequest(v=1, type="haptic.request", command_id="c0", duration_ms=0, reason="test")

    # Valid duration
    ack, pulse = supervisor.request_pulse(
        HapticRequest(v=1, type="haptic.request", command_id="c1", duration_ms=50, reason="test")
    )
    assert ack.accepted is True
    assert pulse is not None
    assert pulse.command_id == "c1"


def test_haptics_cooldown_and_deduplication():
    supervisor = HapticSupervisor(enabled=True, cooldown_ms=1000)

    # First pulse accepted
    ack1, pulse1 = supervisor.request_pulse(
        HapticRequest(v=1, type="haptic.request", command_id="c100", duration_ms=30, reason="test")
    )
    assert ack1.accepted is True

    # Immediate duplicate ID rejected
    ack2, pulse2 = supervisor.request_pulse(
        HapticRequest(v=1, type="haptic.request", command_id="c100", duration_ms=30, reason="test")
    )
    assert ack2.accepted is False
    assert "Duplicate command_id" in ack2.reason

    # Different ID within cooldown rejected
    ack3, pulse3 = supervisor.request_pulse(
        HapticRequest(v=1, type="haptic.request", command_id="c101", duration_ms=30, reason="test")
    )
    assert ack3.accepted is False
    assert "cooldown active" in ack3.reason
