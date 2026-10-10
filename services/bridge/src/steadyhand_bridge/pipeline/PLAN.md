# Motion pipeline plan

## Purpose and boundaries

The service owns timestamped acquisition supervision, bounded rolling windows, health/freshness, calibration orchestration and optional actuator supervision. Person 4 owns all numerical algorithms inside `steadyhand_signal`.

## Current state

Directory empty, Person 4's library not in this checkout's base; no live samples or physical pulse. Read [service README](../../../README.md), [contracts](../../../../../docs/contracts.md), and [analysis boundary](../../../../../analysis/README.md).

## Exact proposed files

Existing: none. Planned `acquisition.py`: drain adapter, validate packets, maintain boot/stream and receive-clock health; `buffers.py`: fixed-capacity rolling samples and loss/overflow counters; `analysis_runner.py`: call actual `steadyhand_signal.analyze_window` on immutable bounded copies and serialize derived frames; `calibration.py`: bounded state machine and `calibrate_stationary` calling boundary; `haptic_supervisor.py`: optional command dedup, cooldown, uncertain pulse/settling exclusion. Link [analysis feature](../../../plans/analysis-integration.md), [calibration feature](../../../plans/calibration-orchestration.md) and [actuator feature](../../../plans/actuator-supervision.md).

## Interfaces and data flow

Adapter `sensor.batch` (`g`, MCU `t_us`, seq, boot/stream, counters) -> receive monotonic time and bounded ring -> clean two-second window -> Person 4 result -> [canonical `motion.frame`](../../../../../docs/contracts.md#7-derived-frame) around 250 ms. Host monotonic clock governs stale after starting 500 ms without a **new** sample, not heartbeat. Missing metrics are `null`. Do not compute a substitute FFT or fake recommendation while the analysis library is unavailable.

## Implementation sequence

1. Validate/deduplicate mock batches with explicit bounded ring and counters.
2. Separate freshness and transport health; invalidate state on boot/stream change.
3. Agree real Person 4 typed export; integrate clean-window analysis and null-quality behavior.
4. Add bounded calibration and, only if physically justified, haptic blanking and pulse recovery.

## Failure and recovery behavior

On gap > declared quality tolerance, repeated timestamps, nonfinite values or sensor staleness, stop recommendations and publish unknown/null state. Exclude pulse and settling overlapping windows until full clean window; MCU boot change clears calibration and pending hardware command state. Queue overflow counts losses and never silently turns stale samples into valid data. Cancel loop and release adapter at shutdown.

## Acceptance checks

- No hardware: synthetic batches, duplicate/stale timestamps, wrap/reboot, ring overflow, invalid clean window and shutdown tests.
- Board: measured rate, I2C losses, reboot and optional pulse events with physical captures.
- Person 4: actual import, known-frequency, invalid-window and calibration rejection fixtures after exact API agreement.

## Handoff

API receives validated current device/quality state and at most one fresh derived frame per update; Person 4 receives actual units, timestamp epochs and counter semantics. Example shape is in [contracts](../../../../../docs/contracts.md), not a backend-private schema.

## Copy-ready implementation prompt

```text
Implement the bounded mock acquisition and freshness slice; no numerical
algorithm. Read AGENTS.md, README.md, plan.md, docs/contracts.md, root
01_dev.md, services/bridge/README.md, this PLAN.md, adapter PLAN.md and
analysis-integration.md. Allowed paths services/bridge/** plus Dev-owned
scripts/root config. Validate batches (<=50), store finite XYZ in g and
monotonic MCU t_us with separate host receive time, cap the ring, count
missing/overflow, invalidate on boot/stream change, mark stale when no new
sample for 500ms. Do not label a healthy socket as fresh sensor data. On
shutdown stop loops; fail closed on bad packets. Run formatter/linter,
pipeline/invalid/reboot tests and package build; hand off state changes and
pending typed Person 4 boundary.
```
