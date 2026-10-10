# Shared canonical JSON examples

## Purpose and boundaries

Supply one JSON fixture collection proving identical TypeScript and Python boundary behavior. These examples are synthetic illustrations, not live measurements, completed tasks, validated calibration or a verified sensor identity.

## Current state

Directory empty. [Contracts](../../../docs/contracts.md) embeds illustrative JSON, including an example LIS3DHTR that is explicitly **not** the identified sensor. No parser/check script or capture exists. Dedeepya's `fixtures/synthetic/signals/*.json` (merged) already use the exact `SensorSample` field names (`seq`, `t_us`, `a_g`, `valid`, `saturated`, `haptic_active`) and are the first realistic inputs for the M3 replay boundary; they are a different file shape (`signal_id/seed/odr_hz/duration_s/components/samples`) from the canonical frames, so do not copy them into `examples/`.

## Exact proposed files

Existing: none. Planned `settings.json`: v1 valid config; `device-hello.json`: synthetic boot/stream/sensor and haptics=false; `sensor-batch.json`: two valid XYZ samples, seq/t_us and counters; `motion-frame.json`: example derived frame with source and quality; `invalid-frame.json`: deliberately malformed version/type or unsafe payload with documented rejection reason. Additional focused invalid fixtures may be named for oversize, NaN-like invalid JSON, missing/null metrics and private extras when needed; avoid useless one-constant copies. `scripts/check-contracts.py` coordinates both validators without creating a competing example set.

## Interfaces and data flow

Use exact field names and units in [contracts](../../../docs/contracts.md#6-device-and-sample-frames): `a_g` in g, MCU `t_us`, no page text or token; `source=synthetic` for generated data, `recorded` only from real replay provenance. Validate settings/config and device/derived examples with TS/Python models; deliberately invalid cases must fail both for the same reason class. A fixture alone does not prove hardware works.

## Implementation sequence

1. Copy canonical examples verbatim except corrections agreed with owner/consumers; label all generated inputs synthetic.
2. Add at least one targeted invalid fixture and expected-rejection manifest/test cases under owned paths after parser exists.
3. Run both validators over every fixture; cover borderline bounds, unsafe timestamps and sensitive unexpected keys with tests.
4. Send examples/validation results to teammates and update for approved version changes only.

## Failure and recovery behavior

Bad JSON, version, nonfinite/out-of-range values, oversize batch, private fields and source mismatch fail validation and do not become a `good` frame. Keep errors safe for logs; replaying an example does not make device health live. A breaking example/schema disagreement blocks publishing until reconciled.

## Acceptance checks

- No hardware: JSON syntax, TS+Python parity for accepted/rejected fixtures, explicit no-secret/no-personal-field scan.
- Actual board: captured live batch checked with same parser, never mislabeled example.
- Teammates: their UI/worker/analysis fixtures parse against approved version; not run without their implementation.

## Handoff

Point to exact examples and shared validation command established during implementation; Person 3/Kripa can build fake UIs with honest states, Person 4 can construct windows from correctly labeled samples.

## Copy-ready implementation prompt

```text
Create canonical JSON examples and cross-language validation, not another
plan. Read AGENTS.md, README.md, plan.md, docs/contracts.md, root 01_dev.md,
packages/contracts/README.md, package/src PLAN.md, this PLAN.md and
services/bridge/README.md. Allowed packages/contracts/**, matching Python
models/tests under services/bridge/**, Dev-owned scripts/root config. Use
agreed v1 settings, synthetic hello/batch/motion examples and invalid-frame
cases. Both TS and Python must accept/reject identical inputs, including
unsafe MCU integers, out-of-range and forbidden personal fields. Do not
label examples as verified live data or generate credentials. Run formatter/
linter, JSON parser checks, TS build/Python fixture tests; hand off file paths,
validation command, failure reasons and unverified physical cases.
```
