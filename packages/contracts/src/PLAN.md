# Contract schema and type modules

## Purpose and boundaries

Keep one strict, exported TypeScript contract boundary for settings, device/sample/derived events and UI adapter types. Numerical TS types and DOM actions remain Person 4/Person 3 responsibilities.

## Current state

Directory empty; no TypeScript files, compiler configuration or installed runtime schema library. Dedeepya's `packages/engine/src/types.ts` is merged and already matches the canonical shapes, so settings/device/engine types can be copied structurally rather than redesigned. Runtime schema strategy: dependency-free hand-written validators in `schemas.ts` (no zod or similar until an owner agreement justifies the dependency). Read [contracts README](../README.md), [master](../../../docs/implementation/dev.md) and [canonical contract](../../../docs/contracts.md).

## Exact proposed files

Existing source: none. Planned `index.ts`: explicit public exports; `settings.ts`: `AssistanceConfig` schema/type and revision validation (structurally identical to `packages/engine/src/types.ts`, including `mode: 'native' | 'stabilized' | 'raw_virtual'` and `filter.kind: 'exponential' | 'one_euro'`); `device.ts`: `device.hello` (including optional `resolution_bits`), `sensor.batch`, `motion.frame`, quality/source/timestamp schema/type; `messages.ts`: agreed worker/UI and HTTP/WS envelopes after consumer review; `schemas.ts`: reusable finite number/version/JSON-safe-int validators and parse helpers, not duplicated competing payloads; `uiAdapter.ts`: `PopupAdapter`/`OptionsAdapter` (`getState`, `enablePage`, `disablePage`, `updateSettings(patch)`, `subscribe`) and dashboard `DeviceClient` (`connect`, `subscribe`, `startCalibration`, `finishCalibration`, `exportSession`) per Person 3's merged `docs/implementation/extension.md` and [contracts §11](../../../docs/contracts.md#11-ui-adapters). `package.json`, `tsconfig.json` live in parent, Python models in `services/bridge`.

## Interfaces and data flow

Expose type inference from runtime schemas, safe parse at service/worker/UI boundaries, config `revision`, `mode`, filter/target/dwell and honest sensor source/quality. [Contracts](../../../docs/contracts.md#2-assistance-configuration) supplies starting ranges (cutoff 0.1–20 Hz, beta 0–1, radius 0–24 px, dwell 600–1500 ms, rearm 200–1000 ms); ambiguity bound and clamp/reject behavior need agreement. Device `t_us` uses increasing safe MCU integer; UI milliseconds and CSS pixels never substitute. Fields without specified shape stay pending, not invented.

## Implementation sequence

1. Agree settings clamp/reject, ambiguity margin and strict extra-field policy; implement settings schema/type.
2. Add device hello, bounded sensor batch and derived frame schema/type with source/quality and null metrics.
3. Add message/adapter envelopes only after affected owners agree shape; version public exports.
4. Verify types and matching Python model parsing against same JSON fixture set.

## Failure and recovery behavior

Reject NaN/Infinity, bad enum/version, negative or unsafe timestamp/sequence, mismatched boot/stream metadata, malformed vector and invalid quality/null fields. A parse error produces no UI action or recommendation and does not mutate last accepted settings revision. Config patch conflicts are rejected/retried by worker, not silently merged in this package.

## Acceptance checks

- No hardware: strict TS typecheck, valid/invalid examples, finite/safe integer, unknown enum/version and schema export tests.
- Actual board: feed captured wire frame through same parser after identity gate.
- Teammates: Person 3 and Kripa import public exports; Person 4 imports settings type without browser dependency.

## Handoff

Give consumers `@steadyhand/contracts` public imports, parser example and exactly which optional fields/null states are accepted, plus change notes for versioned schema decisions.

## Copy-ready implementation prompt

```text
Implement strict exported TS runtime schemas in packages/contracts/src/**.
Read AGENTS.md, README.md, plan.md, docs/contracts.md, root 01_dev.md,
packages/contracts/README.md, parent PLAN.md, this PLAN.md and examples/
PLAN.md. Allowed packages/contracts/** plus Dev-owned matching Python
models/scripts/root config. Confirm installed dependency versions and agree
settings ambiguities. Create index/settings/device/schemas with finite safe
fields, version 1, canonical enums, null invalid motion values and <=50
samples. Implement messages/uiAdapter only for fields agreed with consumers;
do not fabricate WS payloads. Reject malformed data and protect last valid
settings revision. Run formatter/linter, strict typecheck/build, shared JSON
accept/reject and Python parity; hand off exact public imports/fixtures.
```
