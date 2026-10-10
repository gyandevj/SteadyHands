"""Protocol wire models and serialization unit tests."""

import pytest
from pydantic import ValidationError
from steadyhand_bridge.contracts import (
    AssistanceConfig,
    DeviceHello,
    SensorBatch,
    SensorSample,
    MotionFrame,
    HapticRequest,
    SessionTaskEvent,
)


def test_assistance_config_valid():
    cfg = AssistanceConfig(
        v=1,
        revision=1,
        mode="stabilized",
        filter={"kind": "one_euro", "min_cutoff_hz": 1.0, "beta": 0.002},
        target={"capture_radius_px": 16, "ambiguity_margin_px": 8},
        dwell={"enabled": True, "duration_ms": 800, "rearm_ms": 300},
    )
    assert cfg.v == 1
    assert cfg.mode == "stabilized"


def test_assistance_config_invalid_bounds():
    with pytest.raises(ValidationError):
        # min_cutoff_hz below 0.1
        AssistanceConfig(
            v=1,
            revision=1,
            mode="stabilized",
            filter={"kind": "one_euro", "min_cutoff_hz": 0.01},
            target={"capture_radius_px": 16, "ambiguity_margin_px": 8},
            dwell={"enabled": True, "duration_ms": 800, "rearm_ms": 300},
        )


def test_sensor_batch_sample_cap():
    samples = [
        SensorSample(
            seq=i,
            t_us=i * 10000,
            a_g=(0.0, 0.0, 1.0),
            valid=True,
            saturated=False,
            haptic_active=False,
        )
        for i in range(51)
    ]
    with pytest.raises(ValidationError):
        SensorBatch(
            v=1,
            type="sensor.batch",
            source="synthetic",
            boot_id="boot",
            stream_id="stream",
            batch_seq=1,
            samples=samples,
            counters={"i2c_errors": 0, "dropped_samples": 0, "queue_overflows": 0},
        )


def test_haptic_request_bounds():
    req = HapticRequest(
        v=1,
        type="haptic.request",
        command_id="cmd-1",
        duration_ms=40,
        reason="test",
    )
    assert req.duration_ms == 40

    # Over 80 ms bound
    with pytest.raises(ValidationError):
        HapticRequest(
            v=1,
            type="haptic.request",
            command_id="cmd-1",
            duration_ms=100,
            reason="test",
        )
