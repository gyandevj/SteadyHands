# Service test plan

## Purpose and boundaries

Focused pytest checks prove contract agreement, lifecycle recovery, source honesty, bounded memory and optional haptic safety. Hardware measurements require actual board tests; Person 4 tests their own numerical library.

## Current state

This directory is empty; no installed service, test runner configuration or board captures. Person 4's analysis suite passes on this host (22/22 with `PYTHONPATH=analysis/src`) and her `fixtures/synthetic/signals/*.json` are available for boundary tests; engine tests are run from the repo root (`node --test "tests/engine/*.test.ts"`, 28/28). Read [service README](../README.md), [master](../../../docs/implementation/dev.md), [analysis integration](../plans/analysis-integration.md), and [testing guidance](../../../docs/testing.md).

## Exact proposed files

Existing: none. Planned `test_protocol.py`: shared JSON accepted/rejected by Python and transport, health/auth and source/provenance cases; `test_stream_reconnect.py`: first-frame timeout/origin/snapshot/slow client/stale sensor/reboot; `test_haptic_dedup.py`: optional opt-in/duration/duplicate/uncertain timeout/blanking. Extend these or add a narrowly named test only when behavior introduces distinct risk; avoid mirroring constants. TS fixture validator belongs to Dev scripts/contracts package.

## Interfaces and data flow

Tests import `steadyhand_bridge.main:create_app` with injectable deterministic adapter and clock; use [canonical examples](../../../packages/contracts/examples/PLAN.md), not copies with drifting values. Check `[g, MCU µs]` independently of host monotonic clock; assert `source` and `quality` separately. `test_analysis_integration.py` reads Person 4's actual `fixtures/synthetic/signals/*.json` and asserts the translation table in [analysis integration](../plans/analysis-integration.md) (5/8 Hz within one FFT bin, quiet → null recommendation, gapped/saturated → non-recommending quality, calibration accept/reject) against the real installed library — not a stub.

## Implementation sequence

1. Health/package and cross-language fixture smoke cases.
2. Malformed batch, source label, stale/boot/counter and bounded queue cases.
3. Auth and snapshot/reconnect, subscriber cleanup and calibration reject/idempotency.
4. Session privacy/dedup; conditional hardware/haptic safety harness.

## Failure and recovery behavior

Use bounded test timeouts and fake clock; cleanup background tasks and sockets even on assertion failure. Simulate duplicate samples, reboot and no-pong without real waits. Record physical checks separately from software simulation; never report a mock motor-off test as hardware proof.

## Acceptance checks

- No hardware: installed pytest, static checks, valid/invalid shared fixtures, missing token, stale sensor with healthy socket, queue overflow and clean shutdown.
- Board: independent scanner/identity/rate/flash/unplug/pulse checks, unrun until available.
- Teammates: exact analysis import and browser/dashboard interop after their implementations.

## Handoff

Provide fixture validation command established from `pyproject.toml`, focused pytest command, mock mode startup steps and explicit unrun physical/consumer checks.

## Copy-ready implementation prompt

```text
Implement focused bridge tests alongside the current bounded service slice.
Read AGENTS.md, README.md, plan.md, docs/contracts.md, root 01_dev.md,
services/bridge/README.md, services/bridge/PLAN.md and this PLAN.md.
Allowed paths services/bridge/** and Dev-owned scripts/root config. Use
canonical JSON fixtures and injected mock/clock to verify actual behavior:
invalid packets, source honesty, boot reset, sensor stale versus live
transport, bounded queues, auth timeout and cleanup, only where implemented.
Do not create tests claiming board verification or reimplement Person 4 FFT.
Run formatter/linter, focused pytest and package build; report commands,
failed/unrun checks, fixtures and consumer handoff.
```
