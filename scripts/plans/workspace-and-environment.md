# Workspace and dependency ownership

## Purpose and boundaries

Provide one root workspace/config authority while owners maintain their own modules. Do not regenerate Person 3/Kripa/Person 4 package files or claim dependency compatibility from guessed versions.

## Current state

No root workspace/config files exist. Inspection host has Python 3.13.7, Node 24.12.0, npm 11.6.2 and `corepack`, but pnpm/UNO Q Arduino CLI are not on PATH; FastAPI, uvicorn and ruff were not installed globally. No service or TypeScript package has been built. Read [scripts plan](../PLAN.md), [master](../../docs/implementation/dev.md).

## Exact proposed files

Existing owned root config: none. Planned root `package.json`: workspace script names only after modules exist; `pnpm-workspace.yaml`: app/package patterns; `tsconfig.base.json`: strict common TS; `.gitignore`: dist/venv/secrets/cache; `.env.example`: non-secret adapter/host/origin names; `pnpm-lock.yaml`: generated only after actual coordinated install. `services/bridge/pyproject.toml` owns Python dependency pins/build, `packages/contracts/package.json` owns its TS dependency; `scripts/check-contracts.py` runs validators.

## Interfaces and data flow

TS workspace exports `@steadyhand/contracts` to owner packages; Python package `steadyhand_bridge` imports Person 4 installable `steadyhand_signal` only after compatible environment confirmed. Fixture runner reads `packages/contracts/examples/*.json` and validates both language models. Repo paths and board-to-laptop host differ; configure loopback-first, never expose token in static config.

## Implementation sequence

1. Inspect installed pnpm/corepack/Node/Python package versions and target board environment; choose versions actually installable.
2. Create strict root workspace and minimal contracts package/service manifests; coordinate with other owners before lockfile change.
3. Establish commands for install, lint, TS check/build, Python tests/package and cross-language fixture check.
4. Verify clean checkout build on laptop; separately verify board dependencies without promising cross-environment installation.

## Failure and recovery behavior

On incompatible Node/Python/native NumPy/analysis install, stop and document tested versions rather than weakening constraints silently. Do not let root scripts report success for missing package. Keep secrets, virtualenv, generated assets and captures untracked. Preserve all sector-specific package scripts.

## Acceptance checks

- No hardware: clean install, workspace graph, strict TS build, Python package install, shared fixture runner and lint in actual host environment.
- Board: actual UNO Q Python/native dependency compatibility, separately unrun.
- Teammates: imports/build for Person 3/4/Kripa packages after their files exist; no false promise before then.

## Handoff

Document verified versions, install and test commands in README after running, with exact manifest exports and the change coordination rule for root lockfile.

## Copy-ready implementation prompt

```text
Implement minimal Dev-owned root workspace and dependency setup. Read
AGENTS.md, README.md, plan.md, docs/contracts.md, root 01_dev.md,
scripts/PLAN.md, this plan, services/bridge/README.md and packages/
contracts/README.md. Allowed root build/environment config, scripts/**,
services/bridge/pyproject.toml, packages/contracts/package.json/tsconfig.
Verify actual installed Node/Python/corepack/pnpm and compatible dependency
versions before pinning; coordinate lockfile changes with team. Add strict
TS config and clean ignore/env example without secrets. Establish runnable
install/lint/typecheck/build/test commands only for existing modules; fail
instead of pretending absent builds pass. Run those commands and hand off
versions, steps, results and board-specific unknowns.
```
