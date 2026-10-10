# Dev-owned scripts and workspace setup

## Purpose and boundaries

Establish reproducible dependency checks, validated launches, extension-build coordination and privacy-safe demo packaging. Dev owns root tooling and scripts; Person 3 owns extension bundling, Person 4 evidence files and Kripa UI build content.

## Current state

Directory empty. No root `package.json`, pnpm install/lock, `pyproject.toml`, built extension or verified Uno Q/laptop command exists. Python/Node/gh/Git are installed on the inspection host but compatibility with proposed deps/board is not established. Read [master](../docs/implementation/dev.md) and [proposed tree](../docs/repository_tree.md).

## Exact proposed files

Existing: none. Planned `check-contracts.py`: drive canonical TS/Python example parity after installs; `dev-service.sh`: verified mock/board launch and dependency/config checks; `build-extension.sh`: delegate to Person 3's real script, no competing bundler; `package-demo.sh`: assemble only built local assets and honest build record. Root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` after tested install and coordination, `tsconfig.base.json`, `.gitignore`, `.env.example` are Dev-owned proposals. See [workspace](plans/workspace-and-environment.md), [launch](plans/launch-and-connectivity.md), [packaging](plans/demo-packaging.md).

## Interfaces and data flow

Root workspace covers `apps/*`, `packages/*`; `@steadyhand/contracts` exports strict schemas, `@steadyhand/engine` and `@steadyhand/ui` are other owners' packages. Python bridge depends on actual Person 4 analysis installation. Scripts use real inspected entry points and explicit mode/source, never invent a board SDK/extension build command. Token is entered at runtime, never included in `.env.example`, package or logs.

## Implementation sequence

1. Verify installed package managers, shells, Python and board toolchain; document exact versions and which commands are not yet runnable.
2. Establish root workspace without modifying other owners' package files; create contract check script after both parsers exist.
3. Prove mock service launch from fresh env and test board-to-laptop route separately.
4. Coordinate real extension build with Person 3, then package/rehearse after component outputs exist.

## Failure and recovery behavior

Missing dependency or command fails fast with next setup step, no silent demo fallback marked live. Use bounded waits/cleanup for child processes; never overwrite teammates' assets or regenerate root lockfile without coordination. Packaging rejects missing built assets, tokens and unverified evidence; `dist/` and `.venv/` remain ignored.

## Acceptance checks

- No hardware: actual install/typecheck/contract test/health launch, missing-tool and clean-shutdown rehearsal once scripts exist.
- Actual board: proven bridge and forwarding/LAN endpoint with version/wiring record.
- Teammates: packaged unpacked extension and dashboard only after their owners supply working builds.

## Handoff

Give teammates exact tested workspace install, service mock launch and contract check commands plus connection URL; report unrun board/extension packaging checks separately.

## Copy-ready implementation prompt

```text
Implement root workspace and minimal validated setup scripts, not app code.
Read AGENTS.md, README.md, plan.md, docs/contracts.md, root 01_dev.md,
scripts/PLAN.md, workspace-and-environment.md, services/bridge/README.md
and packages/contracts/README.md. Allowed scripts/** and Dev-owned root
build/dependency/environment config; coordinate root lockfile with team.
Inspect actual Node/Python/shell, establish strict workspace and tested
dependency versions, install commands and contract-check runner only when
both parsers exist. Never invent extension build or board SDK calls. Fail
clearly on missing dependencies and do not store token in env example.
Run formatter/linter, real workspace typecheck/build and Python contract
checks; hand off exact versions/commands, reproducible mock setup and
unverified board/consumer stages.
```
