# Dev-owned scripts and workspace setup

## Purpose and boundaries

Establish reproducible dependency checks, validated launches, extension-build coordination, and privacy-safe demo packaging. Dev owns root tooling and scripts; Person 3 owns extension bundling, Person 4 evidence files, and Kripa UI build content.

## Current state

Directory empty except plans. Inspection host: Node v24.12.0, npm 11.6.2, Python 3.13.7, pip 25.2, pytest 9.1.1; **pnpm is not installed** (corepack exists, not enabled). Root workspace decision: **npm workspaces**; the `pnpm-workspace.yaml`/lock references in the shared tree are stale scaffold. Two commands are already verified on this host without any install: engine tests (`node --test "tests/engine/*.test.ts"`, 28/28) and analysis tests (`$env:PYTHONPATH="analysis/src"; python -m pytest tests/analysis -q`, 22/22). Read [master](../docs/implementation/dev.md), [workspace](plans/workspace-and-environment.md), and the [proposed tree](../docs/repository_tree.md).

## Exact proposed files

Existing: none. Planned scripts (PowerShell primary because the demo laptop is Windows; `.sh` equivalents optional and untested):

- `setup.ps1`: verify Node/npm/Python, create `.venv`, install `-e ./analysis`, install `-e ./services/bridge` (after M2), run contract check.
- `run-mock.ps1`, `run-replay.ps1`, `run-hardware.ps1`: thin wrappers over `python -m steadyhand_bridge --mode …` with fail-fast dependency checks.
- `check-contracts.py`: drive canonical TS/Python example parity after installs.
- `check-analysis-integration.py`: replay every `fixtures/synthetic/signals/*.json` through adapter + real `analyze_window` and assert the M3 translation table (5/8 Hz within one FFT bin, quiet null recommendation, gapped/saturated non-recommending, calibration accept/reject).
- `demo-smoke.ps1`: start mock, wait for `/health`, receive one schema-valid `motion.frame`, exit nonzero on failure; optionally run the same check against replay/hardware when requested.
- `build-extension.sh`/`package-demo.sh` from the old tree: keep as coordination stubs that delegate to Person 3's real build script; do not invent a competing bundler.
- Root `package.json` (npm workspaces `apps/*`, `packages/*`), `package-lock.json` only after a real coordinated install, `tsconfig.base.json`, `.gitignore`, `.env.example` are Dev-owned.
- `services/bridge/pyproject.toml` owns Python dependency pins/build; `packages/contracts/package.json` owns its TS dependency (TypeScript only, as root devDependency, until justified otherwise).

## Proposed commands (exact; status labeled)

| Purpose | Command and working directory | Status |
| --- | --- | --- |
| Engine tests | `node --test "tests/engine/*.test.ts"` — repo root | **Verified 2026-10-10: 28/28** |
| Analysis tests | `$env:PYTHONPATH="analysis/src"; python -m pytest tests/analysis -q` — repo root | **Verified 2026-10-10: 22/22** |
| Analysis install | `pip install -e ./analysis` — repo root | Planned (M3); unverified |
| Contract validation | `python scripts/check-contracts.py` — repo root | Planned (M1); unverified |
| Backend setup | `python -m pip install -e ./services/bridge` after its `pyproject.toml` exists — repo root | Planned (M2); pin exact versions after install |
| Mock mode | `scripts/run-mock.ps1` → `python -m steadyhand_bridge --mode mock --host 127.0.0.1 --port 8765` | Planned (M2); port is a candidate until confirmed at launch |
| Replay mode | `scripts/run-replay.ps1 -Fixture fixtures/synthetic/signals/pure_sine_5hz_100hz.json` | Planned (M3) |
| Analysis integration check | `python scripts/check-analysis-integration.py` — repo root | Planned (M3) |
| Hardware mode | `scripts/run-hardware.ps1` | Blocked on M4 bridge/route verification; no command until then |
| Firmware build/upload | Exact toolchain CLI recorded in `firmware/unoq/build-record.md` after verification | Blocked; do not invent flags |
| Demo smoke | `scripts/demo-smoke.ps1 [-Mode mock\|replay\|hardware]` | Planned (M6) |

Token is entered at runtime and never written into `.env.example`, scripts, or logs. Every planned command above must be re-run and its result recorded in the session/handoff before being quoted as working.

## Interfaces and data flow

Root workspace covers `apps/*`, `packages/*`; `@steadyhand/contracts` exports strict schemas, `@steadyhand/engine` and `@steadyhand/ui` are other owners' packages (engine is dependency-free and runs via Node type stripping; do not force a build step on it). Python bridge depends on Person 4's analysis installation order (`analysis` first, then `services/bridge`; do not add a fragile file-URL dependency, assert the import at startup with a clear error). Scripts use real inspected entry points and explicit mode/source, never invent a board SDK or extension build command.

## Implementation sequence

1. Verify installed package managers, shells, Python and board toolchain; document exact versions and which commands are not yet runnable (done for Node/npm/Python; board pending).
2. Establish root npm workspace without modifying other owners' package files; create the contract check script in M1 after both parsers exist.
3. Prove mock service launch from a fresh environment and keep replay/analysis checks in CI-shaped scripts; test the board-to-laptop route separately.
4. Coordinate the real extension build with Person 3, then package/rehearse after component outputs exist.

## Failure and recovery behavior

Missing dependency or command fails fast with the next setup step, never a silent demo fallback marked live. Use bounded waits/cleanup for child processes; never overwrite teammates' assets or regenerate a root lockfile without coordination. Packaging rejects missing built assets, tokens, and unverified evidence; `dist/`, `.venv/`, and captures stay ignored.

## Acceptance checks

- No hardware: actual install/typecheck/contract test/health launch, missing-tool and clean-shutdown rehearsal once scripts exist; engine and analysis suites rerun from the root commands above.
- Actual board: proven bridge and forwarding/LAN endpoint with version/wiring record.
- Teammates: packaged unpacked extension and dashboard only after their owners supply working builds.

## Handoff

Give teammates exact tested workspace install, service mock launch, and contract-check commands plus the connection URL; report unrun board/extension packaging checks separately.

## Copy-ready implementation prompt

```text
Implement root workspace and minimal validated setup scripts, not app code.
Read AGENTS.md, README.md, plan.md, docs/contracts.md,
docs/implementation/dev.md, root 01_dev.md, scripts/PLAN.md,
workspace-and-environment.md, services/bridge/README.md and
packages/contracts/README.md. Allowed scripts/** and Dev-owned root
build/dependency/environment config; coordinate root lockfile with the team.

Use npm workspaces (pnpm is not installed); do not force a build step on
packages/engine (it runs via node type stripping) and do not modify other
owners' package files. Establish strict TS config, clean ignore/env example
without secrets, and only commands for modules that exist. Reuse the verified
root invocations for engine and analysis tests. Never invent extension build
or board SDK calls. Fail clearly on missing dependencies; no fake live mode.

Run the commands you add, formatter/linter, real workspace typecheck/build and
Python contract checks; hand off exact versions/commands, reproducible mock
setup, and explicitly unrun board/consumer stages.
```
