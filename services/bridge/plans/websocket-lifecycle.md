# WebSocket lifecycle and slow clients

## Purpose and boundaries

Provide fresh, bounded, authenticated derived-state updates to the extension worker and dashboard. The content script never opens a socket or waits for network replies during pointer filtering/dwell.

## Current state

Only the route and event names appear in [contracts](../../../docs/contracts.md#9-websocket-handshake-and-events). Exact snapshot/subscribe/device-health envelopes and heartbeat deadline are unresolved with Person 3 and Kripa; no socket code exists.

## Exact proposed files

Existing implementation: none. Planned `src/steadyhand_bridge/api/stream.py`: authenticate, snapshot, subscription, heartbeat and per-client fanout; `src/steadyhand_bridge/models.py`: agreed WS payloads; `src/steadyhand_bridge/pipeline/acquisition.py`: current state/sensor freshness; `tests/test_stream_reconnect.py`: worker restart, slow clients and task cleanup.

## Interfaces and data flow

WS `/v1/stream`: first `client.auth` within 3s -> validated `state.snapshot`; downstream `device.hello`, `device.health`, `motion.frame`, `calibration.state`, optional haptic events. `client.ping`/`server.pong` request IDs, approximately 20-second client heartbeat per [architecture](../../../docs/architecture.md#4-worker-lifetime-and-transport). Derive freshest snapshot from current state, not a queue replay; dashboard can request raw batches only by agreed explicit subscription; extension receives derived-only. Fresh sensor is not inferred from socket ping.

## Implementation sequence

1. Agree snapshot schema, subscription authorization, heartbeat expiration and error codes.
2. Implement auth/snapshot with a fake adapter and state version/epoch reset.
3. Add bounded per-client queues, replaceable-state coalescing and optional dashboard raw subscription.
4. Prove reconnect after worker suspension, MCU reboot, sensor stall and service shutdown.

## Failure and recovery behavior

Maximum input starts 64 KiB; reject invalid JSON, unsupported version/type, unauthorized raw subscription and rate abuse. Use bounded queues (propose small fixed capacity, review actual rate) and prefer newest replaceable motion/health frame; never silently drop non-replaceable command results. Close persistently slow client with explicit reason instead of retaining unbounded history. Cancel heartbeat/producer fanout tasks at disconnect; only one timer set per connection. On reconnect never resend selection or motor commands.

## Acceptance checks

- No hardware: pre-auth silence, three-second timeout, origin rejection, missing pong, multi-client slow reader, coalescing, new snapshot and no task leaks.
- Board: actual boot/stream change and freshness transitions on wire; pending physical check.
- Teammates: extension worker and dashboard consumption, authorization of raw debug; pending integrations.

## Handoff

Supply actual endpoint/Origin/token instructions and canonical snapshot/derived examples once agreed; extension resets stale derived state on reconnect, preserves local mouse path.

## Copy-ready implementation prompt

```text
Implement authenticated mock-backed WS snapshot/heartbeat/subscription after
agreeing envelope and failure shapes with Person 3 and Kripa. Read AGENTS.md,
README.md, plan.md, docs/contracts.md, docs/architecture.md, root 01_dev.md,
services/bridge/README.md, its API PLAN.md, auth plan and this plan. Allowed
services/bridge/** and owned root/scripts config. Enforce first auth within
3s, <=64KiB input, derived-only default, 20s application ping support,
bounded slow-client queues and cancel/cleanup. New connections get current
snapshot; stale sensor can coexist with healthy WS; no action or cue replay.
Run formatter/linter, reconnect/slow/invalid/auth tests and build. Handoff
exact tested messages, endpoint and remaining browser/board checks.
```
