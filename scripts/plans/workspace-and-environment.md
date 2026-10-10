# Workspace and dependency ownership

## Purpose and boundaries

Provide one root workspace/config authority while owners maintain their own modules. Do not regenerate Person 3/Kripa/Person 4 package files or claim dependency compatibility from guessed versions.

## Current state

No root workspace/config files exist. Inspection host has Python 3.13.7, Node 24.12.0, npm 11.6.2 and `corepack`, but pnpm/UNO Q Arduino CLI are not on PATH; FastAPI, uvicorn and ruff were not installed globally. **Decision: npm workspaces**, since npm is installed and verified while pnpm is not; corepack remains an unused fallback. Person 4's engine (dependency-free, Node type stripping) and analysis (zero-dep, `pip install -e`) already run on this host. Read [scripts plan](../PLAN.md), [master](../../docs/implementation/dev.md).

## Exact proposed files

Existing owned root config: none. Planned root `package.json` with `workspaces: ["apps/*", "packages/*"]` and workspace script names only after modules exist; `package-lock.json` generated only after an actual coordinated install; `tsconfig.base.json`: strict common TS; `.gitignore`: dist/venv/secrets/cache; `.env.example`: non-secret adapter/host/origin names. `services/bridge/pyproject.toml` owns Python dependency pins/build; `packages/contracts/package.json` owns its TS dependency (TypeScript only, as root devDependency until justified otherwise); `packages/engine` stays dependency-free (Node type stripping); `scripts/check-contracts.py` runs validators. The shared `repository_tree.md`/`docs/repository_tree.md` still list `pnpm-workspace.yaml`; update those shared docs only with owner coordination and note the divergence here.

## Interfaces and data flow

TS workspace exports `@steadyhand/contracts` to owner packages; Python package `steadyhand_bridge` imports Person 4 installable `steadyhand_signal` only after compatible environment confirmed. Fixture runner reads `packages/contracts/examples/*.json` and validates both language models. Repo paths and board-to-laptop host differ; configure loopback-first, never expose token in static config.

## Implementation sequence

1. Verify installed Node/npm/Python package versions and target board environment; choose versions actually installable (npm decision recorded; board pending).
2. Create strict root npm workspace and minimal contracts package/service manifests; coordinate with other owners before lockfile change.
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
Verify actual installed Node/npm/Python and compatible dependency versions
before pinning (pnpm is absent, npm workspaces chosen); coordinate lockfile
changes with the team. Add strict
TS config and clean ignore/env example without secrets. Establish runnable
install/lint/typecheck/build/test commands only for existing modules; fail
instead of pretending absent builds pass. Run those commands and hand off
versions, steps, results and board-specific unknowns.
```
