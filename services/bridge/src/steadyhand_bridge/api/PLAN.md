# HTTP and WebSocket API plan

## Purpose and boundaries

The API exposes authenticated sensor/advisory state, calibration, non-personal sessions and optional bounded cues. No page click, cursor coordinates, URL proxy or unrestricted GPIO endpoint exists.

## Current state

Directory empty. [Contracts](../../../../../docs/contracts.md#8-http-api) list routes and event names, but snapshot/subscription and full error schemas are still to be agreed with Person 3 and Kripa. Read [service README](../../../README.md).

## Exact proposed files

Existing: none. Planned `health.py`: public `GET /health` version/uptime; `device.py`: protected `GET /v1/device`; `calibration.py`: start/get/finish with idempotent request IDs; `haptics.py`: protected opt-in request validation only; `sessions.py`: create/event/export; `stream.py`: `/v1/stream` origin/auth, snapshots, subscriptions, heartbeat and bounded fanout. Helpers in parent `auth.py`, `models.py`; do not create route-specific replacement schemas.

## Interfaces and data flow

HTTP bearer token on protected `/v1/*`; WS `client.auth` first within three seconds, then agreed `state.snapshot` and derived events; `client.ping`/`server.pong` with IDs as in [contracts](../../../../../docs/contracts.md#9-websocket-handshake-and-events). Distinguish transport connected, sensor fresh, quality and source. Dashboard raw subscription is opt-in; extension receives derived frames only. Client-provided page content and token-in-URL are forbidden. Exact subscription/auth-error/snapshot shapes remain unresolved.

## Implementation sequence

1. Serve `/health` from app factory with privacy test.
2. Protect `/v1/device` and validate representations using mock adapter.
3. Implement auth/snapshot, subscription, heartbeat, reconnect and slow-client policy after payload agreement.
4. Add calibration, sessions and optional actuator routes as their supervisors land.

## Failure and recovery behavior

Reject oversized (>64 KiB initially), malformed, late or unauthorized WS frames and wrong origins before subscriptions. Fail protected HTTP consistently; do not leak token/errors with secrets. Bound per-client outbound queue, coalesce replaceable state, close irrecoverably slow clients; on reconnect send current snapshot, not queued historic commands. Timeouts free tasks.

## Acceptance checks

- No hardware: health and unauthorized-route tests, WS late-auth/wrong-origin/oversize, snapshots on reconnect, slow-client and multi-client cleanup.
- Board: source/health after physical disconnect/restart.
- Teammates: worker restarts and dashboard raw subscription/visibility need actual consumer integration.

## Handoff

Give consumers actual tested host/port, token entry steps, route/error examples, one authenticated snapshot and freshness transition. Do not present the example `motion.frame` in contracts as a verified physical measurement.

## Copy-ready implementation prompt

```text
Implement a bounded mock-backed /v1/device and WS connection stage after
agreeing snapshot/subscription/error fields with Person 3 and Kripa. Read
AGENTS.md, README.md, plan.md, docs/contracts.md, root 01_dev.md,
services/bridge/README.md, services/bridge/PLAN.md, this PLAN.md and the
authentication and websocket-lifecycle feature plans. Allowed paths only
services/bridge/** and owned scripts/root config. Enforce bearer HTTP and
origin plus first-frame WS token within 3s; validate <=64KiB frames, send
fresh snapshot, derived-only default, 20s application heartbeat, bounded
queue/backoff cleanup, and no command replay. Differentiate stalled sensor
from healthy pong. Run formatter/linter, focused auth/reconnect/slow-client
tests and package build; hand off actual endpoint, examples and failures.
```
