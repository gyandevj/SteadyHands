# Calibration orchestration

## Purpose and boundaries

Dev manages session ID, phase, capture duration, cancellation and result publication; Person 4 calculates stationary baseline/quality, and Kripa implements UX. No calibration alters extension settings without user acceptance there.

## Current state

The [HTTP routes](../../../docs/contracts.md#8-http-api) mention `stationary|intentional` but Person 4's documented function is `calibrate_stationary`; no intentional-phase algorithm, rejection schema or duration has been finalized. No backend session exists.

## Exact proposed files

Existing implementation: none. Planned `src/steadyhand_bridge/pipeline/calibration.py`: bounded state machine and clean samples, idempotent request IDs; `src/steadyhand_bridge/api/calibration.py`: start/get/finish routes; `src/steadyhand_bridge/models.py`: agreed phase/state/error response models; `tests/test_protocol.py`: repeated start/finish and invalidation cases.

## Interfaces and data flow

`POST /v1/calibration/start` with phase/request ID -> session ID; GET progress -> state; POST finish with request ID -> baseline or rejection. Proposed states `capturing`, `ready`, `complete`, `rejected`, `cancelled` need agreement with Kripa/Person 4 before models. Window receives `g` acceleration and MCU `t_us`; sensor metadata includes verified mount/range/ODR/boot; a reboot or mount/config change invalidates baseline. Only call `steadyhand_signal.calibrate_stationary(samples, sensor_metadata)` with actual agreed types. Intentional phase remains unimplemented until owner defines semantics.

## Implementation sequence

1. Agree state/result/rejection and intentional-phase meaning with Person 4 and Kripa.
2. Implement one bounded in-memory stationary capture, idempotent start/finish and status polling against synthetic labeled samples.
3. Invoke actual Person 4 function; reject on low quality/stale/reboot/insufficient window.
4. Publish result/recommended preset as advisory and test reset/retry.

## Failure and recovery behavior

Reject simultaneous conflicting phases, invalid request IDs, stale input, saturation, gaps and haptic overlap; duplicate request ID returns same operation/result. Timeout/cancel frees sample buffer; restart loses in-memory session and reports not found, never reconstructs fictitious calibration. Boot/stream/range/mount changes revoke baseline and block recommendation.

## Acceptance checks

- No hardware: repeated start/finish, insufficient samples, timeout, moving/saturated/stale samples, reboot and cancellation.
- Board: stationary orientation/rate and deliberate movement captures with truthful rejection reasons.
- Teammates: Person 4 exact baseline model and Kripa rejected/retry UX; pending integrations.

## Handoff

Give Kripa agreed progress/rejection JSON fixtures, retry/timeout semantics and optional recommendation only after valid analysis. Give Person 4 actual sensor metadata and rejected-window cases.

## Copy-ready implementation prompt

```text
Implement bounded stationary calibration orchestration, not a numerical
calibration algorithm. Read AGENTS.md, README.md, plan.md, docs/contracts.md,
root 01_dev.md, services/bridge/README.md, its pipeline/API PLAN.md, Person
4 analysis/README.md and this plan. Agree exact types/state/error payloads
with Person 4 and Kripa first. Allowed services/bridge/** and owned root/
scripts configuration. Implement idempotent start/finish, bounded clean
capture, status, timeout, cancel, reboot invalidation and readable rejection.
Call Person 4's actual calibrate_stationary; do not fabricate successful
measured calibration or apply pointer settings. Run formatter/linter,
rejection/idempotency tests and build; hand off fixtures/remaining gates.
```
