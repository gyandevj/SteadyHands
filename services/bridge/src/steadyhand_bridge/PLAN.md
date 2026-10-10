# Python service package plan

## Purpose and boundaries

The installable `steadyhand_bridge` package assembles validated runtime configuration, pairing, routes, adapters and lifespan tasks. Browser control and Person 4 numerical calculations remain outside this package.

## Current state

This directory contains only empty `adapters/`, `api/`, `pipeline/` and `sessions/` directories. Read [service README](../../README.md), [master](../../../../docs/implementation/dev.md), and [contracts](../../../../docs/contracts.md). No Python files exist.

## Exact proposed files

Existing source: none. Planned `__init__.py` exports version; `main.py` exports `create_app(config=None)` and one importable application with FastAPI lifespan and dependency wiring; `config.py` validates launch mode, bind address/origin policy, capacity and bounded timeouts; `models.py` defines Python wire models matching JSON examples (shared contract owner Dev); `auth.py` validates pairing tokens and scopes without echoing secrets. Subdirectories own [adapters](adapters/PLAN.md), [API](api/PLAN.md), [pipeline](pipeline/PLAN.md), [sessions](sessions/PLAN.md).

## Interfaces and data flow

Config chooses one adapter and creates one acquisition supervisor; routes receive services through app state/dependency injection, not module globals. Parse every incoming frame with `models.py` against [canonical contracts](../../../../docs/contracts.md); never accept a server-provided pointer position or arbitrary backend URL. Distinguish `source` from `quality` and network transport. Unspecified snapshot/health/error schemas must be agreed with consumers before concrete model classes are finalized.

## Implementation sequence

1. Package entry point, version, validated settings and app factory with `/health`.
2. Wire models and fake adapter and fixture checks.
3. Add pairing dependencies and controlled shutdown for producer, sockets and in-memory stores.
4. Assemble live adapter and Person 4 analysis only after their verified gates.

## Failure and recovery behavior

Invalid environment settings fail fast; an adapter failure publishes unavailable and cancels producer, not a false live fallback. Never spawn duplicate lifespan workers on reload. Stop accepting new commands on shutdown; redact tokens from logs; bound waits when closing tasks.

## Acceptance checks

- No hardware: multiple app instances do not share tokens/queues; config errors fail; `/health` avoids secrets; lifespan test stops tasks.
- Board: verify only after live adapter configured and present.
- Teammates: check Python model agreement with TS examples and exact `steadyhand_signal` exports.

## Handoff

Backend owners receive importable `steadyhand_bridge.main:create_app`, env names and tested dependency/install instructions; UI receives contract-shaped example data via the actual routes after stage 2.

## Copy-ready implementation prompt

```text
Implement the service package shell, not another plan. Read AGENTS.md,
README.md, plan.md, docs/contracts.md, root 01_dev.md,
services/bridge/README.md, services/bridge/PLAN.md and this PLAN.md.
Allowed paths: services/bridge/** and owned root/scripts config. Implement
version, strictly validated config, FastAPI create_app/lifespan, /health, and
models only for agreed canonical examples. Reject unknown invalid fields,
misleading source claims and bad mode/port config. Shut down tasks safely;
never expose a token in health/logs. Run formatter/linter, packaging and
focused tests; hand off import, launch commands, valid/invalid fixtures and
unresolved socket/calibration schema decisions. Hardware checks remain unrun.
```
