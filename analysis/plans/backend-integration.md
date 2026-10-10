# Backend Service Integration Plan (`analysis/plans/backend-integration.md`)

**Owner:** Person 4 (Dedeepya)  
**Consumer:** Dev (Person 1 - Backend & Hardware)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document defines the integration boundary between the `steadyhand_signal` Python library and Dev’s FastAPI backend service (`services/bridge`).

### Separation of Responsibilities
- **Dev (Person 1):** Manages serial/I2C communication, the fixed-size sample ring buffer, WebSocket client broadcasts, HTTP endpoints (`/v1/calibration`, `/v1/device`), and actuator commands.
- **Person 4 (Dedeepya):** Provides the stateless mathematical functions `analyze_window()` and `calibrate_stationary()`.

---

## 2. Dev's Rolling Window Loop

Dev maintains an in-memory ring buffer (e.g. `collections.deque(maxlen=240)`) populated by incoming MCU batches:

```python
# services/bridge/app/stream.py (Example implementation for Dev)
from steadyhand_signal import analyze_window, SensorCapability, MotionResult

class MotionStreamWorker:
    def __init__(self, capability: SensorCapability):
        self.capability = capability
        self.buffer: collections.deque[SensorSample] = collections.deque(maxlen=240)
        self.calibration = None
        self.last_emit_time = 0.0

    def on_batch_received(self, samples: list[SensorSample]):
        for s in samples:
            self.buffer.append(s)

        # Trigger analysis every 250ms if buffer is populated
        now = time.monotonic()
        if now - self.last_emit_time >= 0.250 and len(self.buffer) >= 200:
            self.last_emit_time = now
            window_list = list(self.buffer)
            result: MotionResult = analyze_window(window_list, self.calibration, self.capability)
            self.broadcast_motion_frame(result)
```

---

## 3. Canonical Frame Serialization

Dev maps `MotionResult` directly into the canonical `motion.frame` JSON structure defined in `docs/contracts.md`:

```json
{
  "v": 1,
  "type": "motion.frame",
  "source": "live",
  "boot_id": "mcu-boot-101",
  "stream_id": "stream-202",
  "frame_seq": 45,
  "window": {
    "start_us": 120000000,
    "end_us": 122000000,
    "fresh_samples": 200
  },
  "quality": {
    "state": "good",
    "reasons": [],
    "measured_hz": 100.2,
    "missing_fraction": 0.0,
    "max_gap_ms": 10.1
  },
  "motion": {
    "status": "periodic_motion",
    "dominant_hz": 5.2,
    "band_rms_g": 0.034,
    "band_power_ratio": 0.74,
    "peak_concentration": 0.68
  },
  "recommendation": {
    "id": "rec-5",
    "preset": "steady",
    "requires_user_acceptance": true,
    "reason_code": "persistent_motion_during_task"
  }
}
```

---

## 4. Acceptance Criteria

- Dev can install `steadyhand_signal` with `pip install -e ./analysis`.
- Running `analyze_window()` against 200 samples takes $<5\text{ ms}$, consuming $<2\%$ CPU on a modern host.

---

## 5. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing backend integration exports in analysis/.

Read analysis/plans/backend-integration.md and docs/contracts.md.

ALLOWED EDITS:
- analysis/src/steadyhand_signal/__init__.py
- tests/analysis/**

TASK:
1. Ensure analyze_window and calibrate_stationary return clean, JSON-serializable dataclasses.
2. Provide tests/analysis/test_backend_integration.py verifying that MotionResult converts seamlessly to dictionaries matching contracts.md.
```
