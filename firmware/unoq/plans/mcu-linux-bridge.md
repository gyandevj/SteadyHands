# Verified MCU/Linux bridge and laptop route

## Purpose and boundaries

Use the UNO Q's actual installed, supported MCU/Linux bridge to drain sensor batches into the Python adapter. This is separate from service-to-browser connectivity; no ordinary UNO R3 serial or guessed Python SDK call.

## Current state

[Build record](../build-record.md) marks installed core/bridge versions, MCU/Linux round trip and board-to-browser route pending. [Hardware](../../../docs/hardware.md#4-firmware-responsibilities) proposes logical methods, not installed library signatures.

## Exact proposed files

Existing `firmware/unoq/build-record.md` only as evidence template. Planned `steadyhand/bridge_rpc.h/.cpp`: installed MCU-side registration, bounded `device_info`, `drain_samples`, `device_health`, optional `queue_haptic` logical handlers with actual verified method signatures; `steadyhand/steadyhand.ino`: initialize/poll proven bridge; `services/bridge/src/steadyhand_bridge/adapters/uno_q.py`: Linux-side verified calls, read deadlines and packet validation; `scripts/dev-service.sh`: launch only after tested environment. Do not edit Person 4 recording schema.

## Interfaces and data flow

Prove *one* minimal MCU↔Linux message first with observed versions, import/header names, payload limits and process lifecycle; then map logical methods into [canonical device/sample frames](../../../docs/contracts.md#6-device-and-sample-frames). Callback validates request, enqueues/drains bounded work and returns without nested RPC. From board Linux service, verify loopback from judging laptop via SSH local forwarding or documented LAN route, actual port/origin and auth; USB does not imply this route.

## Implementation sequence

1. Inspect installed UNO Q core/bridge package examples/API and run a tiny MCU/Linux round trip with timeout/logged result.
2. Register diagnostic `device_info`/health and bounded sample drain against verified API.
3. Connect validated Python adapter with timeouts, error counters and source=live only with real data.
4. Verify board-local `/health`, laptop loopback route, extension/dashboard handshake and restart behavior.

## Failure and recovery behavior

Bridge callback never blocks sampling or network; timeout returns unavailable with counters, not repeated stale data. On Linux/MCU restart refresh boot/stream identity and discard in-flight hardware state. On link loss do not auto-promote replay/mock as live. Validate packet version/size/batch cap before service ingestion; optional motor remains MCU deadline supervised even with transport down.

## Acceptance checks

- Without hardware: adapter mock protocol and size/retry tests, route plan only.
- Actual UNO Q: recorded installed SDK signatures/versions, round-trip, drain batch, unplug/restart, board-local and laptop endpoint; currently unrun.
- Teammates: Person 3/Kripa origin/host permission and fresh snapshot from laptop.

## Handoff

Give backend actual SDK import and entry point, RPC return payload/capture, measured failure timeout, board build/flash/run commands and tested laptop URL/forwarding instructions in build record.

## Copy-ready implementation prompt

```text
Implement the smallest verified UNO Q MCU/Linux bridge round trip, then
bounded diagnostic info/drain; no guessed SDK API. Read AGENTS.md, README.md,
plan.md, docs/contracts.md, docs/hardware.md, docs/architecture.md, root
01_dev.md, firmware/unoq/README.md, build-record.md, this plan and bridge
adapter PLAN.md. Allowed firmware/unoq/**, services/bridge/**, Dev-owned
scripts/root config. Inspect actual installed core/examples/bridge methods,
prove MCU/Linux ping with deadlines, then bounded callbacks and validated
Python drain; independently prove board-to-laptop endpoint. On disconnect
publish unavailable, do not substitute synthetic live. Run installed
formatter/build and physical round-trip/laptop tests where available; hand
off actual versions, signatures, packets, commands and limitations.
```
