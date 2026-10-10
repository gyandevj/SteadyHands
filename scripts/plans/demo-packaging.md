# Release and demo packaging

## Purpose and boundaries

Assemble a reproducible local demo from real built modules with a clear synthetic/recorded/live distinction. Person 3 builds extension assets; Kripa dashboard; Person 4 actual evidence. Dev wires launch and packaging without rewriting their output.

## Current state

No source builds, lockfile, `dist/`, dashboard, sensor capture or measured benchmark exists. [Proposed repository tree](../../docs/repository_tree.md) lists `build-extension.sh`/`package-demo.sh` only as future scripts.

## Exact proposed files

Existing implementation: none. Planned `scripts/build-extension.sh`: call Person 3's verified package script and assert packaged manifest/assets, not create a new bundler; `scripts/package-demo.sh`: stage verified backend launch/config instructions, extension build and *only actual approved* evidence; `scripts/dev-service.sh`: validated mode launch; `firmware/unoq/build-record.md`: truthful measured hardware record when physical checks run. Root `.gitignore` excludes generated dist/cache/venvs; do not edit other owners' assets.

## Interfaces and data flow

After the real npm workspace and Python installation, perform scoped checks, call installed extension/dashboard build scripts where supplied, verify packaged MV3 uses local assets/no remote code, include actual endpoint and pairing instructions without token. Treat synthetic example messages as demos, not measured evidence. Record exact versions, validated contract fixtures and source labels. Worker/browser integration belongs to Person 3.

## Implementation sequence

1. Wait for contract/mock build, extension owner build and dashboard build; verify each real command/output.
2. Script build coordination, artifact presence and secret exclusion checks with cleanup on failure.
3. If live device available, attach actual build record and capture references approved by Person 4; otherwise demo uses clearly labeled mock/recorded fallback.
4. Rehearse fresh launch on laptop, reconnect/disable and restart; note unverified physical checks honestly.

## Failure and recovery behavior

Missing output/invalid schema/no permission fails packaging rather than copying stale build. Prevent inclusion of `.env`, tokens, virtualenv, personal traces and unverified claims. Keep old artifacts from being mistaken for current by staging cleanly; no destructive cleanup of other sectors. If board unavailable, package software-only + explicitly synthetic path and mark limitation.

## Acceptance checks

- No hardware: real package/build commands, fresh-out artifact, no secret scan, mock startup/contract tests and team rehearsal after apps exist.
- Actual board: wiring/build record and live restart checks only if physically performed.
- Teammates: Person 3 clean load-unpacked MV3, Kripa dashboard, Person 4 real benchmark/evidence approvals.

## Handoff

Give team archive/path, tested run/stop commands, actual included versions, pairing workflow, known unsupported behaviors and independent no-board demo path.

## Copy-ready implementation prompt

```text
Implement release script coordination once Dev service, Person 3 extension,
Kripa dashboard and Person 4 evidence artifacts actually exist. Read
AGENTS.md, README.md, plan.md, docs/contracts.md, docs/testing.md, root
01_dev.md, scripts/PLAN.md, this plan, services/bridge/README.md and
firmware/unoq/build-record.md. Allowed scripts/** and Dev-owned root
build/env config plus Dev-owned verified build record; do not edit other
owners' outputs. Invoke actual owner-provided build commands, assert local
packaged extension assets and schema-valid source-labeled examples, exclude
secrets/venv/raw private captures, and show real mock/live launch paths.
Fail on missing artifacts; do not fake evidence. Run formatter/linter, real
test/build/package commands and fresh-start rehearsal; report unrun checks,
archive contents and consumer instructions.
```
