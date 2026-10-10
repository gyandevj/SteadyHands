# Shared contract package plan

## Purpose and boundaries

Provide Dev-owned TypeScript runtime validation/types and canonical cross-language fixtures; matching Python models live in the service. The package is a wire and UI-adapter boundary, not a numerical engine, UI implementation or new schema outside [canonical contracts](../../docs/contracts.md).

## Current state

[README](README.md) exists; `src/` and `examples/` are empty and no package metadata/build tooling exists. The TypeScript package name `@steadyhand/contracts` is proposed; no installed dependency versions have been verified. Dedeepya's `packages/engine` and `analysis/steadyhand_signal` are implemented, merged into `origin/main` (PR #1) and verified on this host (28/28 engine tests, 22/22 analysis tests). `packages/engine/src/types.ts` already matches `docs/contracts.md` §2/§4 exactly; her Python models differ in the documented ways (see [master](../../docs/implementation/dev.md) §2.3). The root workspace decision is npm workspaces (Node 24.12 / npm 11.6.2 installed, pnpm absent).

## Exact proposed files

Existing `README.md`. Planned `package.json`/`tsconfig.json`: strict versioned exports/build/test; [source modules](src/PLAN.md): `index.ts`, `settings.ts`, `device.ts`, `messages.ts`, `schemas.ts`, `uiAdapter.ts`; [canonical examples](examples/PLAN.md): `settings.json`, `device-hello.json`, `sensor-batch.json`, `motion-frame.json`, `invalid-frame.json`; `services/bridge/src/steadyhand_bridge/models.py` matching Python validators; `scripts/check-contracts.py` coordinating checks.

## Interfaces and data flow

Worker, UI, dashboard and engine import `@steadyhand/contracts` TS exports; Python service reads same JSON examples into its own matching models. Preserve `v:1`, source `live|recorded|synthetic|unavailable`, quality enums, CSS pixels/UI ms versus MCU `t_us` and `g`, null invalid metrics, <=50 samples per batch and exact JSON-safe integers. Runtime validation occurs at every incoming boundary. [Canonical interface](../../docs/contracts.md) wins over proposals in another owner's plan; unresolved envelopes and settings clamp policy are listed in [master](../../docs/implementation/dev.md#11-open-decisions-and-integration-requests).

## M1 reconciliation decisions (agreed direction, sign-off requested)

1. `capability` is the analysis config boundary; backend calls `analyze_window(samples, calibration=None, capability=None, last_haptic_pulse_end_us=None)` by keyword. `docs/contracts.md` §5 wording updates in M1 with Dedeepya's sign-off.
2. Backend owns quality/status translation: analysis `invalid` → canonical `degraded` while transport is fresh, plus `warming_up`/`stale`/`unavailable` from host state; `broadband_motion` → `other_motion`.
3. Add optional `resolution_bits` to `device.hello.sensor` (additive, no version bump); `capabilities.haptics` is projected from the same capability struct.
4. Runtime validation is dependency-free hand-written strict validators in `schemas.ts`; add a schema library only with owner agreement.
5. `AssistanceConfig`/`EngineInput`/`EngineOutput`/`Target` stay structurally identical to `packages/engine/src/types.ts`; contracts owns runtime schemas, engine stays standalone.

## Implementation sequence

1. Agree field-specific settings constraints and the M1 mismatch resolutions with Dedeepya, Person 3, and Kripa.
2. Add strict TS schema/types and valid/invalid examples; establish actual package dependency versions from installed environment (only TypeScript as root devDependency verified needed).
3. Add matching Python models and one cross-language fixture runner.
4. Agree missing transport/calibration/session/haptic payloads before expanding exports; communicate versioned changes.

## Failure and recovery behavior

Reject unknown version, invalid source, nonfinite/out-of-range numbers, oversized batch, unsafe timestamp or extra sensitive fields according to agreed strictness. Parser failures must not be converted to healthy/valid state; no token or entered values in examples. A breaking version change requires coordinated consumers, not a silent partial deployment.

## Acceptance checks

- No hardware: TS strict build, matching Python accept/reject outcomes for all shared examples, version/source and sensitive-extra-field tests.
- Actual board: validate a captured `device.hello` and batch against same schemas after acquisition, not a synthetic-only success.
- Teammates: import/build across Person 3/Kripa/Person 4 after their modules exist.

## Handoff

Send package import/version, schema parse exports, example paths plus invalid-case behavior to all; Python import and canonical fixtures to backend. Device-hello example model is illustrative, not actual sensor identity.

## Copy-ready implementation prompt

```text
Implement the initial shared-contract package as code, not more planning.
Read AGENTS.md, README.md, plan.md, docs/contracts.md,
docs/implementation/dev.md, root 01_dev.md, packages/contracts/README.md,
this PLAN.md, src/PLAN.md, examples/PLAN.md, services/bridge/README.md and
scripts/PLAN.md. Apply the M1 mismatch resolutions in the master plan §2.3
and record them as a handoff table for Dedeepya. Allowed packages/contracts/**,
services/bridge/** for matching models and tests, Dev-owned scripts/root
config only. Agree ambiguous setting validation with affected owners;
implement strict TS schemas/types for agreed settings/device/sample/derived
fields, matching Python validators and identical accepted/rejected JSON
fixtures. Reject nonfinite/unsafe timestamps, bad version/source, malformed
or >50 sample batches and private unexpected fields. Run actual formatter/
linter, TS build/typecheck, Python fixtures and package build. Handoff exact
exports/examples/errors and versioned consumer instructions.
```
