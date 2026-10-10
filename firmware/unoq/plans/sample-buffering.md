# Fixed sample queue and timebase

## Purpose and boundaries

Decouple MCU sensor cadence from bridge drain latency using fixed memory, explicit loss/error counters and wrapping-safe timestamps. Person 4 decides window quality, not MCU spectral features.

## Current state

No queue/clock code, measured sample frequency or memory budget; MCU timer width and available RAM must be checked on the installed core. [Contracts](../../../docs/contracts.md#6-device-and-sample-frames) cap wire batches at 50, aiming ~10.

## Exact proposed files

Existing implementation: none. Planned `steadyhand/sample_queue.h/.cpp`: compile-time capacity ring (size chosen after core RAM check), monotonic 64-bit MCU microseconds extended from verified timer, seq/batch IDs, drain with capped batch, overflow/I2C/drop counters; `steadyhand/steadyhand.ino`: bounded producer cadence; `steadyhand/bridge_rpc.cpp`: bounded drain only. Do not add dynamic allocation in sampling path.

## Interfaces and data flow

Fresh coherent sample -> monotonically increasing `seq` and extended `t_us` -> fixed ring -> drain <=50 and transport `sensor.batch` with `batch_seq`, boot/stream IDs and cumulative counters. Define explicit drop-oldest versus drop-newest policy after reviewing analysis quality (proposed drop oldest to favor fresh state); increment counter for each loss. Timer-wrap extension must not double-correct with Person 4 analysis; agree canonical t_us as already monotonic and <= JS safe integer, rotate boot/stream before precision limit or timestamp uncertainty.

## Implementation sequence

1. Inspect timer width, rollover interval, core RAM, actual ODR and max bridge pause; choose fixed capacity/byte budget and overflow policy.
2. Implement wrapping-safe extended timestamp with bounded polling and restart boot ID; test rollover and monotonicity.
3. Implement enqueue/drain, counters, seq and batch IDs; cap output <=50 and target 10/flush.
4. Stress slow bridge/multiple wrap/reboot; compare gaps with backend ingestion and Person 4 quality checks.

## Failure and recovery behavior

On overflow count loss rather than blocking or silently discarding; on timer uncertainty, mark stream unusable/reset epoch instead of emitting backwards time. Dropped samples show seq gaps; count invalid reads separately from queue overflow. Drain callback returns promptly; reboot clears ring and rotates boot ID, so old batches cannot be mixed with new stream.

## Acceptance checks

- Without hardware: deterministic ring full/empty/wrap/counter/<=50 host tests, simulated rollover and boot change.
- Actual board: measured capacity under sampling with bridge stalled, multiple timer wrap/long uptime if feasible, memory use and real packet gaps.
- Teammates: Person 4 accepts agreed wrap owner/epoch and loss counter semantics.

## Handoff

Backend receives bounded batches and honest counters; Person 4 receives strictly increasing extended MCU µs or explicit invalid epoch. Queue capacity and drop policy appear in build record after measurement.

## Copy-ready implementation prompt

```text
Implement fixed-size sample queue and wrapping-safe MCU clock in firmware/
unoq/steadyhand/sample_queue.h/.cpp after verifying installed core timer
and RAM. Read AGENTS.md, README.md, plan.md, docs/contracts.md, root
01_dev.md, firmware/unoq/README.md, build-record.md, sensor-acquisition.md
and this plan. Allowed firmware/unoq/** and owned scripts/root config.
Agree once-only timer extension with Person 4. Use no heap in acquisition,
bounded drain <=50, explicit seq/batch/cumulative drops, boot/stream epoch;
handle wrap and stalled consumer without blocking. Run formatter/build and
host rollover/overflow tests, physical stalled-drain checks if possible;
handoff measured memory/capacity, counters and packet fixtures.
```
