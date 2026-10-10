# Dedeepya analysis integration (M3)

## Purpose and boundaries

Dev translates bounded, validated device samples and metadata into the actual `steadyhand_signal` calling convention and publishes contract-shaped results. Dev does not implement PSD, signal quality heuristics, noise-floor inference, or pointer filtering. All DSP stays in Person 4's library.

## Current state (verified 2026-10-10)

- Implementation is merged into `origin/main` (PR #1); branch `origin/planning/dedeepya` @ `750ba1a`.
- Verified from a `git archive` copy on this host (no install): `import steadyhand_signal` OK with 17 exports; `python -m pytest tests/analysis -q` → **22 passed**; package `steadyhand-signal` v0.1.0, zero third-party deps, `requires-python >= 3.10`, setuptools, planned install `pip install -e ./analysis`.
- `docs/contracts.md` §5 wording (`config`, `sensor_metadata`) is stale against the actual signature below; reconcile in M1 (see [master](../../../docs/implementation/dev.md) §2.3). The backend adapts at the boundary either way.

## Actual API consumed

```python
from steadyhand_signal import (
    SensorSample, SensorCapability, CalibrationResult, MotionResult,
    analyze_window, calibrate_stationary,
)

# samples: list[SensorSample] with seq:int, t_us:int, a_g:tuple[float,float,float],
#          valid:bool, saturated:bool, haptic_active:bool  (immutable, g, MCU µs)
result: MotionResult = analyze_window(
    samples,
    calibration=None,                  # CalibrationResult | None
    capability=None,                   # SensorCapability | None; default odr 100.0/generic
    last_haptic_pulse_end_us=None,     # int | None
)

cal: CalibrationResult = calibrate_stationary(samples, capability)
```

- Inputs are plain dataclasses, keyword-callable; no Pydantic, no I/O, no internal state.
- `analyze_window` internally calls `validate_window`, resamples to `capability.odr_hz`, computes summed per-axis PSD, extracts 3–12 Hz features, classifies, and optionally recommends.
- Empty/short/inverted/gapped/wrong-rate windows return a `MotionResult` with `quality.state` `invalid`/`degraded`, `motion.status` `unknown`, all numeric motion fields `None`, and `recommendation=None`. Exceptions are not the control flow; still wrap the call.
- Finite values, duplicate/non-increasing `seq`, and negative timestamps are **not** checked by the library; the backend boundary must reject them before buffering.

## Backend calling loop

- Adapter batches feed a fixed ring (`collections.deque(maxlen=…)`) sized from the declared ODR: 2.0 s window → 240 samples at 120 Hz, 200 at 100 Hz; keep at least one full window plus one update period.
- Track per stream: `boot_id`, `stream_id`, last sample `t_us`/seq, host receive `time.monotonic()`, cumulative counters (received, dropped, invalid, duplicate, overflow).
- Trigger analysis when: len(buffer) ≥ 32 (library minimum) **and** ≥ 250 ms since last emission **and** a fresh sample arrived since the last window. Prefer a full 2 s window; mark earlier windows `warming_up`.
- Run analysis off the event loop (`asyncio.to_thread`, or a dedicated single worker); never block HTTP/WS handling. A single serialized worker per stream preserves window ordering; input is an immutable `list(buffer)` snapshot.
- Map the result with the tables below and publish one `motion.frame` per trigger (≈4 Hz), plus `device.health` on change.
- On `boot_id`/`stream_id` change: clear buffer, calibration reference, counters, and last pulse; publish reset state. On no new sample ≥ 500 ms (host monotonic clock): quality `stale`, motion `unknown`, null recommendation until the next full clean window. Never backfill a new boot with old samples.
- Calibration windows: accumulate the newest stationary capture; final call `calibrate_stationary(list(window), capability)`. `CalibrationResult` is held by `pipeline/calibration.py` and passed into subsequent calls, never persisted in the library.
- Haptics later only: record `last_haptic_pulse_end_us` from `haptic.pulse`/MCU counters and pass it on every call. Blanking returns quality `haptic_blanking`, null motion, null recommendation; wait for a full clean window before recommending again.

## Mapping `MotionResult` → canonical `motion.frame`

| Canonical field | Source | Rule |
| --- | --- | --- |
| `window.start_us/end_us/fresh_samples` | backend window | MCU `t_us` of first/last sample; count of valid samples actually analyzed |
| `quality.state` | `result.quality.state` + host state | translation table below |
| `quality.reasons` | `result.quality.reasons` | forward as-is, no rewriting |
| `quality.measured_hz` | `result.quality.measured_hz` | pass through |
| `quality.missing_fraction` | `result.quality.missing_fraction` | pass through |
| `quality.max_gap_ms` | `result.quality.max_gap_ms` | pass through |
| `motion.status` | `result.motion.status` | `broadband_motion` → `other_motion`; otherwise pass through |
| `motion.dominant_hz` / `band_rms_g` / `band_power_ratio` / `peak_concentration` | same field | pass through, `null` stays `null` |
| `recommendation` | `result.recommendation` | pass through (`id`, `preset`, `requires_user_acceptance`, `reason_code`); never auto-apply |
| `source` | adapter | `synthetic`/`recorded`/`live` from the producing adapter; never inferred from socket health |
| `frame_seq` | backend | monotonic per stream |

Quality translation (backend-owned; analysis code unchanged):

| Analysis `quality.state` | Canonical when transport fresh | Notes |
| --- | --- | --- |
| `good` | `good` | numeric motion fields present unless low energy (`dominant_hz=None`) |
| `degraded` | `degraded` | reasons explain loss/jitter/saturation |
| `invalid` | `degraded` | reasons preserved; motion is already `unknown`/null; use `warming_up` instead while no full window exists |
| `haptic_blanking` | `haptic_blanking` | actuator only |
| — (no new sample ≥ 500 ms) | `stale` | host monotonic clock, heartbeat-independent |
| — (adapter down/analysis exception) | `unavailable` | `command.error`/health carry a safe reason |

## Failure and recovery behavior

- Catch library exceptions, log a safe summary, emit `quality.state="unavailable"` with `motion.status="unknown"` and null recommendation; keep serving other endpoints and never fabricate numbers.
- Reject non-finite `a_g`, non-increasing `seq`, `t_us` inversion, oversize batches (>50), and unknown boot/stream epochs at the adapter/buffer boundary.
- Do not analyze incomplete, stale, or contaminated windows; rebuild a full clean window after reboot, mount change, gap, or blanking.
- No auto-preset acceptance: `recommendation` is advisory; pointer settings authority stays with the extension worker.

## Implementation sequence

1. Confirm M1 mismatch resolutions with Dedeepya; keep her files untouched.
2. Implement `pipeline/analysis_runner.py` (bounded window snapshot → `analyze_window` in a worker → canonical frame) and `pipeline/calibration.py`; serialize through `models.py`.
3. Wire `adapters/replay.py` over `fixtures/synthetic/signals/*.json` as `source=synthetic`; add `scripts/check-analysis-integration.py`.
4. Add calibration endpoints (`POST /v1/calibration/start`, `GET /v1/calibration/{id}`, `POST /v1/calibration/{id}/finish`) with idempotent request IDs and the analysis rejection reasons.
5. Add `tests/test_analysis_integration.py` using the same fixture files; keep a fault-injection path for an analysis exception.

## Acceptance checks

- No hardware (all runnable now): `pip install -e ./analysis` or `PYTHONPATH=analysis/src`; known 5 Hz and 8 Hz fixtures yield `dominant_hz` within one FFT bin; quiet fixture yields `quiet` with null recommendation; gapped/saturated fixtures never recommend; saturated fixture calibrates to `rejected`; measured cadence ≈250 ms with an injected clock; emitted frames validate against `packages/contracts/examples/motion-frame.json`.
- Board (unrun until M4): real measured rate, mount, and capture limitations; deliberate-motion capture reviewed with Person 4.
- Teammates: Person 4 reviews translation table; Person 3/Kripa render quality/null states from real frames.

## Handoff

Person 4 receives: the mismatch-resolution table, actual fixture results (dominant Hz, quality states), and any place the library forced a backend workaround. Kripa/Person 3 receive real derived frames with honest source/quality/recommendation labels; raw samples never go to content scripts.

## Copy-ready implementation prompt (M3)

```text
Implement Milestone 3 (Dedeepya analysis integration) only. Read AGENTS.md,
README.md, plan.md, docs/contracts.md, docs/implementation/dev.md §2-3,
services/bridge/README.md, this plan, pipeline PLAN.md, analysis/README.md,
and Dedeepya's analysis/src/steadyhand_signal/{__init__,models,validation,
state,calibration,blanking}.py on origin/main. Allowed: services/bridge/**,
scripts/**, Dev-owned root config. Do NOT edit analysis/** or any Person 4
file; record any needed change as an integration request.

Deliver: bounded 2s rolling window (deque sized from declared ODR), analysis
every ~250ms via analyze_window in a worker thread with an immutable sample
snapshot, calibration orchestration around calibrate_stationary with the
documented 64-sample/800ms/0.05g rules, replay adapter over
fixtures/synthetic/signals/*.json labeled source=synthetic, canonical
motion.frame serialization with the quality/status translation table in
services/bridge/plans/analysis-integration.md, and scripts/check-analysis-
integration.py. Reject non-finite/non-increasing-seq/oversize input before
buffering; reboot/reset clears calibration and windows; analysis exception
yields quality=unavailable with null motion, never fabricated numbers.

Verify: run the analysis integration checks over every synthetic fixture
(5Hz/8Hz within one FFT bin, quiet null recommendation, gapped/saturated no
recommendation), calibration accept/reject, cadence with injected clock,
frame schema validation, ruff, and service pytest. Report exact commands,
observed frames, and unrun hardware/consumer checks.
```
