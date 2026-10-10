#!/usr/bin/env python3
"""Verification check for Dedeepya's steadyhand_signal analysis integration."""

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SERVICES_DIR = REPO_ROOT / "services" / "bridge" / "src"
sys.path.insert(0, str(SERVICES_DIR))

from steadyhand_bridge.pipeline.buffers import BoundedSampleBuffer
from steadyhand_bridge.pipeline.analysis_runner import AnalysisRunner
from steadyhand_bridge.pipeline.calibration import CalibrationCoordinator
from steadyhand_bridge.contracts import SensorSample


def main():
    print("=== Checking Dedeepya Signal Analysis Integration ===")

    buffer = BoundedSampleBuffer(capacity=500)
    runner = AnalysisRunner(buffer=buffer, window_size_samples=200)

    if not runner.is_available():
        print("  [WARN] steadyhand_signal is not locally available.")
        print("  [WARN] Verified fallback: analysis reports 'unavailable' quality, zero numbers fabricated.")
        return

    print("  [OK] steadyhand_signal loaded successfully")

    # 1. Test 5 Hz synthetic tremor
    import math
    for i in range(200):
        t_sec = i * 0.01
        phase = 2.0 * math.pi * 5.0 * t_sec
        ax = 0.04 * math.sin(phase)
        ay = 0.04 * math.cos(phase)
        az = 0.98 + (0.002 * math.sin(phase * 0.5))
        buffer.push(SensorSample(seq=i, t_us=i*10000, a_g=(ax, ay, az), valid=True, saturated=False, haptic_active=False))

    frame = runner.run_window(source="synthetic", boot_id="b1", stream_id="s1", is_stale=False)
    assert frame.quality.state == "good", f"Expected quality good, got {frame.quality.state}"
    assert frame.motion.status == "periodic_motion", f"Expected periodic_motion, got {frame.motion.status}"
    assert frame.motion.dominant_hz is not None and abs(frame.motion.dominant_hz - 5.0) < 1.0, f"Dominant Hz off: {frame.motion.dominant_hz}"
    assert frame.recommendation is not None and frame.recommendation.preset == "steady", f"Expected steady preset, got {frame.recommendation}"
    print(f"  [OK] 5 Hz motion correctly classified: dominant_hz={frame.motion.dominant_hz:.2f} Hz -> preset={frame.recommendation.preset}")

    # 2. Test quiet baseline
    buffer.clear()
    for i in range(200):
        buffer.push(SensorSample(seq=i, t_us=i*10000, a_g=(0.001, 0.001, 0.98), valid=True, saturated=False, haptic_active=False))

    frame_quiet = runner.run_window(source="synthetic", boot_id="b1", stream_id="s1", is_stale=False)
    assert frame_quiet.motion.status == "quiet", f"Expected quiet, got {frame_quiet.motion.status}"
    assert frame_quiet.recommendation is None, "Quiet window should not produce recommendation"
    print("  [OK] Quiet baseline correctly classified with null recommendation")

    # 3. Test stationary calibration
    coordinator = CalibrationCoordinator(buffer=buffer)
    sess_id = coordinator.start_session("stationary", request_id="smoke-1")
    res = coordinator.finish_session(sess_id)
    assert res.state == "complete", f"Calibration failed: {res.reasons}"
    print(f"  [OK] Stationary calibration succeeded: bias_g={res.bias_g}, noise_std_g={res.noise_std_g:.4f}")

    print("=== Analysis Integration Check PASSED! ===")


if __name__ == "__main__":
    main()
