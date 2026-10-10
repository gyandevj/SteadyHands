# UNO Q sketch modules plan

## Purpose and boundaries

Provide small MCU modules for sensor, ring buffer, verified bridge methods and optional safe actuator, keeping acquisition independent of host transport. Person 4 analysis and Dev FastAPI HTTP/WS run off the MCU.

## Current state

This directory is empty; no sketch, SDK, selected sensor driver or compiled binary. Read [firmware README](../README.md), [build record](../build-record.md), [hardware gates](../plans/hardware-identification.md), and [contracts](../../../docs/contracts.md).

## Exact proposed files

Existing: none. Planned `steadyhand.ino`: startup/boot ID, sensor diagnostics mode and nonblocking sampling/bridge pump; `sensor_driver.h/.cpp`: actual model-specific identity/range/resolution/ODR/data-ready/coherent reads and `g` conversion after identification; `sample_queue.h/.cpp`: fixed-size ring, extended timestamp clock, sequence/batch/counters and bounded drain; `bridge_rpc.h/.cpp`: installed bridge-specific verified registration, validate/enqueue command and return, health/drain/info encoding; `haptic_control.h/.cpp`: initially disabled capability, conditional driver and dedup/cooldown/off-deadline supervision only after physical gate. No speculative third-party SDK include or make target yet.

## Interfaces and data flow

Boot sets new `boot_id`; for each verified fresh sample, timestamp in extended MCU µs, assign sequence and finite `[ax,ay,az]` in `g`, then enqueue; bounded `drain_samples` builds <=50 sample `sensor.batch` with counters and stream ID. Transport and MCU clock extension ownership must be agreed with Person 4. An ack only means queued haptic request; physical pulse start/end use same MCU epoch.

## Implementation sequence

1. Build scanner/metadata/clock diagnostics independent of unknown sensor.
2. Implement proven sensor driver and data-ready polling with bounded I2C retries.
3. Implement fixed ring and wrapping-safe clock; prove sampling during slow/no bridge.
4. Register actual installed bridge methods with bounded drains/diagnostics.
5. Add motor module only if verified circuit is present and off deadline proven.

## Failure and recovery behavior

On I2C fault, increment errors and return control promptly, do not publish stale XYZ as new. Drop according to documented bounded overflow policy and increment counters; reboot rotates boot ID, clears queues/dedup and output off. Bridge callback never blocks on network or nested RPC. Optional motor stops even if callback/host fails.

## Acceptance checks

- No hardware: build/static checks only after toolchain actually installed; simulated ring/timer tests are not electrical verification.
- Board: scanner, identity, measured sample freshness/rate, unplug, overflow, bridge stall/reboot, and conditional physical motor-off.
- Teammates: Person 4 validates g/timestamp semantics and artifact exclusion, backend imports verified bridge packet output.

## Handoff

Deliver actual build/flash/launch commands, chip-matched driver/version, sample metadata and a captured schema-valid batch to backend; fill `build-record.md` with actual proof paths.

## Copy-ready implementation prompt

```text
Implement UNO Q diagnostics and bounded queue modules in firmware/unoq/**
only. Read AGENTS.md, README.md, plan.md, docs/contracts.md, docs/hardware.md,
root 01_dev.md, firmware/unoq/README.md, build-record.md, this PLAN.md and
sensor/buffer/bridge focused plans. First inspect actual sensor, board bus,
toolchain and bridge; avoid unverified calls. Make a scanner/identity mode,
then only with identified chip implement coherent fresh XYZ in g, MCU µs
wrap-safe clock, fixed queue, seq/errors and capped batches. Ensure stalled
bridge cannot stall sampling and invalid reads never appear fresh. Leave
haptics disabled. Run installed formatter/build, host queue tests, physical
scan/rate/reboot checks where available, mark others unrun. Handoff packet,
versions/wiring and exact flashing/diagnostic steps.
```
