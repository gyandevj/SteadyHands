# Bridge service implementation plan

## Purpose and boundaries

Dev provides a local FastAPI sensor/advisory service with replaceable adapters. It never drives the browser pointer, clicks, DOM or arbitrary GPIO; Person 4 provides analysis, Person 3 owns the worker, and Kripa owns dashboard transport.

## Current state

Only [README](README.md) exists; `src/steadyhand_bridge/` and `tests/` contain empty subdirectories, without Python packaging, service code or installed bridge evidence. Person 4's `analysis/steadyhand_signal` is implemented and merged into `origin/main` (PR #1) and was verified on this host (22/22 pytest, importable, zero deps); Person 3's WS expectations are in `docs/implementation/extension.md` (`ws://127.0.0.1:8765/v1/stream`, first-frame `client.auth`, 20 s ping, backoff, snapshot caching). The local `planning/dev` tree predates those merges — cut the implementation branch from `origin/main`. Read [master](../../docs/implementation/dev.md), [canonical contracts](../../docs/contracts.md), and [analysis integration](plans/analysis-integration.md).

## Exact proposed files

Existing: `README.md` (preserve). Planned: `pyproject.toml` (build backend, typed Python dependencies/test/lint groups based on verified install); `src/steadyhand_bridge/{__init__,main,config,models,auth}.py` (version, app factory/lifespan, validated configuration, wire models, pairing); [adapters](src/steadyhand_bridge/adapters/PLAN.md), [API](src/steadyhand_bridge/api/PLAN.md), [pipeline](src/steadyhand_bridge/pipeline/PLAN.md), [sessions](src/steadyhand_bridge/sessions/PLAN.md), [tests](tests/PLAN.md). Feature specifications: [lifecycle](plans/configuration-and-lifecycle.md), [auth](plans/authentication.md), [WS](plans/websocket-lifecycle.md), [calibration](plans/calibration-orchestration.md), [analysis](plans/analysis-integration.md), [actuator](plans/actuator-supervision.md).

## Interfaces and data flow

Launch-time mode `mock|replay|uno_q` selects one producer -> validated `sensor.batch` -> bounded acquisition and Person 4 `steadyhand_signal` -> canonical `motion.frame` -> HTTP/WS derived state. Use `g`, MCU microseconds and separate host monotonic receipt time; maintain boot/stream IDs, loss counters and freshness independently of socket health. See [contracts](../../docs/contracts.md), especially sections 5–10. Snapshot/health and replay-provenance payload gaps remain unagreed with Person 3, Kripa and Person 4; see [master decisions](../../docs/implementation/dev.md#11-open-decisions-and-integration-requests).

## Implementation sequence (mapped to master-plan milestones)

1. **M1 contracts:** canonical wire models and cross-language fixtures land in `packages/contracts` + `src/steadyhand_bridge/{contracts,models}.py`; minimal `pyproject.toml`.
2. **M2 mock service:** installable app factory, public `/health`, protected `/v1/device`, mock adapter, bounded buffers, auth, WS snapshot/subscriptions, slow-client policy; frames carry `warming_up`/null motion until M3; never label mock as live.
3. **M3 analysis:** import the actual Person 4 library, wire `pipeline/analysis_runner.py` + `pipeline/calibration.py`, replay synthetic fixtures, calibration endpoints; see [analysis integration](plans/analysis-integration.md).
4. **M4/M5 hardware:** verified UNO Q adapter only after the bridge round-trip gate; live `source` and disconnect/reboot recovery through the same pipeline.
5. **M6 release:** optional sessions/export; haptics only after physical verification; real launch commands and demo fallback.

## Failure and recovery behavior

Reject invalid mode/config on startup, never silently switch a failing live adapter to synthetic; publish unavailable/stale while retaining service and software-only consumers. Bound buffers and client queues; reset hardware-derived state on boot/stream changes. Shutdown cancels tasks, closes clients and leaves optional motor MCU-supervised; avoid leaking tokens or page content into logs.

## Acceptance checks

- Without hardware: install, lint/type checks, `/health`, invalid packets, auth rejection, multi-client reconnect, queue overflow and stale-versus-connected tests; commands to establish after implementation.
- Actual board/sensor: measured fresh batches, unplug and reboot/reconnect; unrun until physical gate.
- Teammates: Person 4 import and browser/dashboard pairing, source labels and null states; unrun until their code exists.

## Handoff

Give Person 3 `ws://127.0.0.1:8765/v1/stream` only after actual launch verification, first-frame auth/snapshot and derived events. Give Kripa token acquisition instructions and calibrated/rejected fixtures; give Person 4 validated sample batches and metadata. A synthetic `device.hello` and `motion.frame` from [contracts](../../docs/contracts.md) are examples, not live results.

## Copy-ready implementation prompt

```text
Implement only the installable service shell and /health. Read AGENTS.md,
README.md, plan.md, docs/contracts.md, root 01_dev.md, this PLAN.md, and
services/bridge/README.md plus configuration-and-lifecycle.md. Allowed paths:
services/bridge/** and Dev-owned scripts/root config only. Inspect actual
environment and pin tested dependency versions; implement app factory/lifespan,
minimal safe config, service version/uptime and clean shutdown; no speculative
UNO Q SDK or numerical algorithms. On invalid config fail startup clearly;
do not claim live hardware. Run local formatter/linter, focused /health tests,
and package build. Handoff verified setup/launch commands, endpoint response,
changed files, check results and deferred adapter/consumer gates.
```
