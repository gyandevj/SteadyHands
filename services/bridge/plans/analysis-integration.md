# Person 4 analysis integration

## Purpose and boundaries

Dev translates bounded, validated device samples and metadata into Person 4's pure `steadyhand_signal` calling convention and publishes contract-shaped results. Dev does not implement PSD, signal quality heuristics, noise-floor inference or pointer filtering.

## Current state

[Canonical analysis boundary](../../../docs/contracts.md#5-python-analysis-interface) names `analyze_window(samples, calibration, config)` and `calibrate_stationary(samples, sensor_metadata)`. [Person 4 README](../../../analysis/README.md) promises typed results; exact imports/models/config and installed package/version are not yet verified. Dedeepya's separate proposal must be reconciled rather than copied as implementation evidence.

## Exact proposed files

Existing implementation: none. Planned `src/steadyhand_bridge/pipeline/analysis_runner.py`: adapt immutable windows, invoke actual package, map result to `motion.frame`; `pipeline/{buffers,acquisition,calibration}.py`: bounded input/boot/reset and baseline orchestration; `models.py`: canonical result serialization; `tests/test_protocol.py`: boundary cases. `analysis/**` files are owned by Person 4 and not changed here.

## Interfaces and data flow

Batch: monotonic MCU `t_us`, finite coherent XYZ in `g`, sample sequence, boot/stream epoch and sensor metadata; host receipt time is independent. Service supplies approximately two-second clean windows no more often than ~250 ms; Person 4 validates quality and derives motion from actual types; service maps only agreed fields to [motion.frame](../../../docs/contracts.md#7-derived-frame) with null numeric fields and null recommendation on invalidity. Acquisition clock wrap is extended at agreed owner boundary once, never twice. Sensor/motor uncertainty blocks output until a full clean window is rebuilt.

## Implementation sequence

1. Agree exact package import/export, sample/config/result types, timestamp wrapping and error behavior with Person 4.
2. Build bounded rolling window and strict canonical serialization against synthetic fixtures, labeling fake analysis as synthetic if temporarily used.
3. Install actual analysis dependency in tested environment and call pure functions without server imports into library.
4. Check clean, gap, duplicate, reboot, saturation, low-energy and haptic-recovery fixtures; run on real capture after board proof.

## Failure and recovery behavior

Do not analyze incomplete, old or contaminated windows; catch expected analysis rejection and emit quality reasons/unknown/null, not zeros or confident recommendations. Unexpected library exception logs safe summary, marks analysis unavailable and continues local extension operation. Reset calibration and windows on epoch change; no auto-preset acceptance.

## Acceptance checks

- No hardware: actual import plus Person 4 good/invalid fixture equivalence, restart/long gap/no recommendation and bounded CPU/memory measurements on installed host.
- Board: rate/range/mount limitations and actual deliberate-motion captures reviewed jointly.
- Teammates: Person 4 export/schema signoff, extension/dashboard source and null-state rendering.

## Handoff

Person 4 receives normalized sample metadata and rejected cases; Kripa/Person 3 receive real derived frames with honest source/quality/recommendation labels, not raw samples into content scripts.

## Copy-ready implementation prompt

```text
Implement service-to-steadyhand_signal integration after Person 4 hands off
actual import paths, typed inputs/results and config. Read AGENTS.md,
README.md, plan.md, docs/contracts.md, docs/hardware.md, root 01_dev.md,
services/bridge/README.md, pipeline PLAN.md, analysis/README.md and this
plan. Allowed services/bridge/**, owned scripts/root config. Build bounded
2s rolling windows and call actual analyze_window/calibrate_stationary;
serialize only agreed motion.frame fields. Reject duplicate/long-gap/stale,
reboot/saturation/haptic windows, emit unknown/null instead of guessed
metrics. Never duplicate DSP. Run formatter/linter, Person 4 fixtures,
focused boundary tests and build; hand off import and exact check results.
```
