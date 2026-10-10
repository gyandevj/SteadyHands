# Configuration and service lifecycle

## Purpose and boundaries

Dev packages one restartable local service with fail-fast configuration and bounded shutdown. Chrome settings belong to Person 3; numerical options belong to Person 4, not environment defaults invented by the service.

## Current state

[Service README](../README.md) is guidance only. No `pyproject.toml`, app factory, launch script or tested Python dependency set exists. [Master](../../../docs/implementation/dev.md) records environment gates.

## Exact proposed files

Existing: `services/bridge/README.md` (preserve). Planned `services/bridge/pyproject.toml` for versioned dependencies/build/test/lint config; `src/steadyhand_bridge/{__init__,main,config}.py` for version, `create_app`/lifespan and validated settings; `scripts/dev-service.sh` for a verified shell launch if available; root `.env.example` for non-secret variables and `.gitignore` for venv/build/token exclusions. Do not generate a lockfile by guessing versions.

## Interfaces and data flow

Proposed launch settings: adapter mode (`mock|replay|uno_q`), bind host/port (loopback-first), token lifetime, dashboard/extension origin allowlist and bounded queue/window settings; final names and defaults must be documented after verifying real deployment. `/health` returns version and uptime only per [contracts](../../../docs/contracts.md#8-http-api). Adapter starts once per app lifespan; shutdown runs exactly once.

## Implementation sequence

1. Inventory installed Python/package/board capabilities and verify target Python dependency compatibility; isolate venv rather than trusting global packages.
2. Establish pyproject metadata and minimal app factory; add config invalid-input and `/health` tests.
3. Start mock producer in lifespan, inject routes and cancel on shutdown.
4. Add real launch script after its shell and working directory are verified on laptop/board.

## Failure and recovery behavior

Reject invalid bind/mode/origins/queue sizes before network start. A worker failure marks device unavailable, never silently changes live to mock. Restrict log fields to non-sensitive IDs/counters/errors; redact pairing tokens. Cancel acquisition, close sockets and bounded queues on shutdown; independent MCU motor-off remains a firmware obligation.

## Acceptance checks

- Without hardware: package installs in a fresh environment, `/health` excludes secrets, invalid config fails, startup/shutdown repeated without orphan tasks; formatter/linter/build commands established then run.
- Actual board: installed Python/bridge and numerical dependencies plus listener route verified; pending physical setup.
- Other teammate: dashboard/extension connect to actual verified host/origins; pending consumer code.

## Handoff

Provide `steadyhand_bridge.main:create_app`, tested Python versions, env example without token, mock launch and `/health` response after actual run; the preferred loopback port is a proposal until verified.

## Copy-ready implementation prompt

```text
Implement Python packaging/config/lifespan and /health only. Read AGENTS.md,
README.md, plan.md, docs/contracts.md, root 01_dev.md, services/bridge/README.md,
services/bridge/PLAN.md and this document. Allowed: services/bridge/**,
scripts/** and Dev-owned root config. Inspect installed versions, create a
tested pyproject and fail-fast config, expose create_app and public version/
uptime health, and ensure startup/shutdown close tasks without token logging.
On invalid settings reject startup; do not claim board compatibility. Run
formatter/linter, focused pytest and packaging/build checks; hand off actual
dependency versions, launch/test commands, endpoint and deferred gates.
```
