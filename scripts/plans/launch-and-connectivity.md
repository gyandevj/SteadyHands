# Backend launch and board-to-laptop connectivity

## Purpose and boundaries

Make labeled mock service available first, then verify UNO Q Linux service reachability from the browser laptop without bypassing browser security. Extension manifest/transport implementation belongs to Person 3; dashboard client to Kripa.

## Current state

No service process, scripts, SSH host/credentials, UNO Q round trip, dashboard or extension build. [Architecture](../../docs/architecture.md#5-backend-and-uno-q) prefers `ws://127.0.0.1:8765/v1/stream`, conditional on a proven laptop route. No route is verified.

## Exact proposed files

Existing implementation: none. Planned `scripts/dev-service.sh`: validate environment/config and run installed `steadyhand_bridge` app with selected mock/replay/live mode; `services/bridge/src/steadyhand_bridge/{config,main}.py`: bind mode, actual version/health; `firmware/unoq/build-record.md`: observed bridge/board/port/forwarding steps. Windows-compatible launch instructions belong in scripts/README or this plan after verified local command, not a fabricated `.sh` invocation on PowerShell.

## Interfaces and data flow

Mock laptop-local service -> `/health` and authenticated HTTP/WS `v1`; actual UNO Q MCU -> installed Linux bridge -> board-local service -> verified SSH local forward or explicitly configured LAN route -> worker/dashboard. Only worker handles extension socket; no page-provided arbitrary backend URL. Pairing token in bearer/first frame, restricted Origin and specific configured host permission. Source labels reflect selected adapter regardless of transport.

## Implementation sequence

1. Install service and start mock on laptop using an actual verified command; obtain public health and authorized snapshot.
2. Prove MCU/Linux round trip, then board-local health/stream if dependencies install.
3. Test laptop-to-board route and actual host/port/Origin/pairing; record exact tested SSH command or LAN choice after establishing hostname/login.
4. Give Person 3/Kripa tested endpoint; rehearse restart, unavailable state and software-only extension fallback.

## Failure and recovery behavior

Bind/origin/token failures are visible; no silent wildcard permissions or browser flags. A forwarding tunnel drop closes transport, leaves extension local assistance and marks device unavailable; reconnect requests fresh snapshot and does not replay haptic commands. Backend connected but sensor stale remains a distinct state. Kill/tidy child process and tunnel on shutdown.

## Acceptance checks

- No hardware: laptop mock health, protected routes/auth snapshot, wrong origin/token and restart.
- Actual board: physical MCU/Linux bridge, board-local listener, laptop forwarded or LAN reachability; unrun now.
- Teammates: actual Chrome host permission and dashboard connection on judging laptop after their builds.

## Handoff

Give actual URLs, launch/stop/forward commands and user pairing instructions with source labels and limitations, not a speculative USB or board hostname command.

## Copy-ready implementation prompt

```text
Implement and verify mock service launch and, only with board available,
actual board-to-laptop connectivity. Read AGENTS.md, README.md, plan.md,
docs/contracts.md, docs/architecture.md, root 01_dev.md, scripts/PLAN.md,
this plan, services/bridge/README.md and firmware/unoq/build-record.md.
Allowed scripts/**, services/bridge/**, firmware/unoq/** and Dev-owned root
config. Detect actual laptop shell and Python env; establish verified mock
/health and paired WS launch/stop. Inspect installed UNO Q bridge and test
board-local service then actual forward/LAN host/Origin; do not assume USB
serial or bypass browser policy. Test disconnect/reconnect and no command
replay. Run formatter/linter/service tests/build, route checks as possible;
handoff tested commands/URLs and explicitly unrun hardware/browser checks.
```
