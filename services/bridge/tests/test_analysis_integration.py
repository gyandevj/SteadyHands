"""Unit and fixture tests for Dedeepya analysis algorithm integration."""

import math
import pytest
from steadyhand_bridge.pipeline.buffers import BoundedSampleBuffer
from steadyhand_bridge.pipeline.analysis_runner import AnalysisRunner
from steadyhand_bridge.pipeline.calibration import CalibrationCoordinator
from steadyhand_bridge.contracts import SensorSample, SensorCapability


def create_synthetic_stream(
    buffer: BoundedSampleBuffer,
    freq_hz: float,
    duration_s: float = 2.0,
    fs_hz: float = 100.0,
    amplitude_g: float = 0.05,
):
    """Populate buffer with pure synthetic sine + gravity samples."""
    n_samples = int(duration_s * fs_hz)
    dt_us = int(1_000_000 / fs_hz)

    for i in range(n_samples):
        t_sec = (i * dt_us) / 1_000_000.0
        phase = 2.0 * math.pi * freq_hz * t_sec
        ax = amplitude_g * math.sin(phase) if freq_hz > 0 else 0.001
        ay = amplitude_g * math.cos(phase) if freq_hz > 0 else 0.001
        az = 0.98 + (0.002 * math.sin(phase * 0.5) if freq_hz > 0 else 0.0)

        buffer.push(
            SensorSample(
                seq=i,
                t_us=i * dt_us,
                a_g=(ax, ay, az),
                valid=True,
                saturated=False,
                haptic_active=False,
            )
        )


def test_analysis_runner_availability():
    buffer = BoundedSampleBuffer()
    runner = AnalysisRunner(buffer=buffer)
    assert runner.is_available() is True, "steadyhand_signal should be successfully imported"


def test_analysis_5hz_periodic_motion():
    buffer = BoundedSampleBuffer(capacity=500)
    create_synthetic_stream(buffer, freq_hz=5.0, duration_s=2.0)

    runner = AnalysisRunner(
        buffer=buffer,
        window_size_samples=200,
        capability=SensorCapability(
            model="test",
            bus="Wire",
            address_hex="0x19",
            odr_hz=100.0,
            range_g=2.0,
            units="g",
        ),
    )

    frame = runner.run_window(
        source="synthetic",
        boot_id="boot-1",
        stream_id="stream-1",
        is_stale=False,
    )

    assert frame.quality.state == "good"
    assert frame.motion.status == "periodic_motion"
    assert frame.motion.dominant_hz is not None
    assert abs(frame.motion.dominant_hz - 5.0) < 1.0  # Within 1 Hz bin
    assert frame.recommendation is not None
    assert frame.recommendation.preset == "steady"


def test_analysis_8hz_periodic_motion():
    buffer = BoundedSampleBuffer(capacity=500)
    create_synthetic_stream(buffer, freq_hz=8.0, duration_s=2.0)

    runner = AnalysisRunner(
        buffer=buffer,
        window_size_samples=200,
    )

    frame = runner.run_window(
        source="synthetic",
        boot_id="boot-1",
        stream_id="stream-1",
        is_stale=False,
    )

    assert frame.quality.state == "good"
    assert frame.motion.status == "periodic_motion"
    assert frame.motion.dominant_hz is not None
    assert abs(frame.motion.dominant_hz - 8.0) < 1.0
    assert frame.recommendation is not None
    assert frame.recommendation.preset == "light"


def test_analysis_quiet_baseline():
    buffer = BoundedSampleBuffer(capacity=500)
    create_synthetic_stream(buffer, freq_hz=0.0, duration_s=2.0, amplitude_g=0.0)

    runner = AnalysisRunner(buffer=buffer, window_size_samples=200)

    frame = runner.run_window(
        source="synthetic",
        boot_id="boot-1",
        stream_id="stream-1",
        is_stale=False,
    )

    assert frame.quality.state == "good"
    assert frame.motion.status == "quiet"
    assert frame.recommendation is None


def test_analysis_warming_up():
    buffer = BoundedSampleBuffer(capacity=500)
    # Only 10 samples (less than min 32)
    for i in range(10):
        buffer.push(
            SensorSample(
                seq=i,
                t_us=i * 10000,
                a_g=(0.0, 0.0, 1.0),
                valid=True,
                saturated=False,
                haptic_active=False,
            )
        )

    runner = AnalysisRunner(buffer=buffer, window_size_samples=200)
    frame = runner.run_window(source="synthetic", boot_id="b", stream_id="s", is_stale=False)

    assert frame.quality.state == "warming_up"
    assert frame.motion.status == "unknown"
    assert frame.recommendation is None


def test_analysis_stale_transport():
    buffer = BoundedSampleBuffer(capacity=500)
    create_synthetic_stream(buffer, freq_hz=5.0, duration_s=2.0)

    runner = AnalysisRunner(buffer=buffer, window_size_samples=200)
    frame = runner.run_window(source="synthetic", boot_id="b", stream_id="s", is_stale=True)

    assert frame.quality.state == "stale"
    assert frame.motion.status == "unknown"
    assert frame.recommendation is None


def test_calibration_coordinator():
    buffer = BoundedSampleBuffer(capacity=500)
    create_synthetic_stream(buffer, freq_hz=0.0, duration_s=1.5, amplitude_g=0.0)

    coordinator = CalibrationCoordinator(buffer=buffer)
    sess_id = coordinator.start_session("stationary", request_id="req-1")

    # Idempotence check
    sess_id_dup = coordinator.start_session("stationary", request_id="req-1")
    assert sess_id == sess_id_dup

    res = coordinator.finish_session(sess_id)
    assert res.state == "complete"
    assert res.noise_std_g < 0.05
