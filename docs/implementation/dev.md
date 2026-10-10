# Dev implementation entry point

**Owner:** Dev (Person 1). **Status:** documentation only; no application implementation or physical verification. **Canonical interface:** [contracts](../contracts.md). Read [project instructions](../../AGENTS.md), [blueprint](../../README.md), [project plan](../../plan.md), [global prompt](../../prompts/global.md), [actual Dev team file](../../01_dev.md), and the module README before implementing.

## Scope and ownership

Dev owns `services/bridge/`, `firmware/unoq/`, `packages/contracts/`, `scripts/`, and root build/dependency/environment configuration. This master plan is Dev's documentation entry point. Kripa owns UI and dashboard; Person 3 owns the extension runtime; Person 4 owns `analysis/`, `packages/engine/`, fixtures and evidence. Do not implement those sectors or change their schemas independently. Pointer timing, DOM actions and mouse coordinates stay in the content script; the service provides advisory sensor-derived state only. The software-only extension does not depend on Dev's service.

## Linked plan index

| Area | Subsystem and focused implementation plans |
| --- | --- |
| Service | [bridge](../../services/bridge/PLAN.md), [package](../../services/bridge/src/steadyhand_bridge/PLAN.md), [adapters](../../services/bridge/src/steadyhand_bridge/adapters/PLAN.md), [API](../../services/bridge/src/steadyhand_bridge/api/PLAN.md), [pipeline](../../services/bridge/src/steadyhand_bridge/pipeline/PLAN.md), [sessions](../../services/bridge/src/steadyhand_bridge/sessions/PLAN.md), [tests](../../services/bridge/tests/PLAN.md) |
| Service features | [configuration and lifecycle](../../services/bridge/plans/configuration-and-lifecycle.md), [authentication](../../services/bridge/plans/authentication.md), [WebSocket lifecycle](../../services/bridge/plans/websocket-lifecycle.md), [calibration orchestration](../../services/bridge/plans/calibration-orchestration.md), [analysis integration](../../services/bridge/plans/analysis-integration.md), [actuator supervision](../../services/bridge/plans/actuator-supervision.md) |
| Firmware | [UNO Q](../../firmware/unoq/PLAN.md), [sketch](../../firmware/unoq/steadyhand/PLAN.md), [hardware identification](../../firmware/unoq/plans/hardware-identification.md), [acquisition](../../firmware/unoq/plans/sensor-acquisition.md), [buffering](../../firmware/unoq/plans/sample-buffering.md), [MCU/Linux bridge](../../firmware/unoq/plans/mcu-linux-bridge.md), [haptic control](../../firmware/unoq/plans/haptic-control.md), [bring-up](../../firmware/unoq/plans/bringup-and-verification.md) |
| Contracts | [package](../../packages/contracts/PLAN.md), [schemas](../../packages/contracts/src/PLAN.md), [examples](../../packages/contracts/examples/PLAN.md) |
| Setup | [scripts](../../scripts/PLAN.md), [workspace and environment](../../scripts/plans/workspace-and-environment.md), [launch and connectivity](../../scripts/plans/launch-and-connectivity.md), [demo packaging](../../scripts/plans/demo-packaging.md) |

## Repository evidence and proposed owned tree

At the initial checkout, only `services/bridge/README.md`, `firmware/unoq/{README.md,build-record.md}`, and `packages/contracts/README.md` are implemented as documents. Their source/test subdirectories and `scripts/` are empty. There are no installed UNO Q bridge versions or verified device readings in this repository. The following are **planned files**, not existing code; the linked subsystem plans specify each responsibility and entry point.

```text
docs/implementation/dev.md
services/bridge/{README.md,PLAN.md,pyproject.toml}
services/bridge/plans/{configuration-and-lifecycle,authentication,websocket-lifecycle,calibration-orchestration,analysis-integration,actuator-supervision}.md
services/bridge/src/steadyhand_bridge/{PLAN.md,__init__.py,main.py,config.py,models.py,auth.py}
services/bridge/src/steadyhand_bridge/adapters/{PLAN.md,base.py,mock.py,replay.py,uno_q.py}
services/bridge/src/steadyhand_bridge/api/{PLAN.md,health.py,device.py,calibration.py,haptics.py,sessions.py,stream.py}
services/bridge/src/steadyhand_bridge/pipeline/{PLAN.md,acquisition.py,buffers.py,analysis_runner.py,calibration.py,haptic_supervisor.py}
services/bridge/src/steadyhand_bridge/sessions/{PLAN.md,store.py,export.py}
services/bridge/tests/{PLAN.md,test_protocol.py,test_stream_reconnect.py,test_haptic_dedup.py}
firmware/unoq/{README.md,build-record.md,PLAN.md}
firmware/unoq/plans/{hardware-identification,sensor-acquisition,sample-buffering,mcu-linux-bridge,haptic-control,bringup-and-verification}.md
firmware/unoq/steadyhand/{PLAN.md,steadyhand.ino,sensor_driver.h,sensor_driver.cpp,sample_queue.h,sample_queue.cpp,bridge_rpc.h,bridge_rpc.cpp,haptic_control.h,haptic_control.cpp}
packages/contracts/{README.md,PLAN.md,package.json,tsconfig.json}
packages/contracts/src/{PLAN.md,index.ts,settings.ts,device.ts,messages.ts,schemas.ts,uiAdapter.ts}
packages/contracts/examples/{PLAN.md,settings.json,device-hello.json,sensor-batch.json,motion-frame.json,invalid-frame.json}
scripts/{PLAN.md,dev-service.sh,build-extension.sh,check-contracts.py,package-demo.sh}
scripts/plans/{workspace-and-environment,launch-and-connectivity,demo-packaging}.md
root: package.json, pnpm-workspace.yaml, pnpm-lock.yaml (only after real install), tsconfig.base.json, .gitignore, .env.example
```

The root scripts above are proposed shell scripts from the [proposed tree](../repository_tree.md), not runnable commands today. Verify a Windows-equivalent launch route on the actual demo laptop before promising one; do not add a shell dependency merely to run a demo. The team member's existing [analysis integration proposal](../../analysis/README.md) may be read after its branch is merged; `analysis/` remains Person 4's path.

## Dependency map and order

1. **Essential, software-independent:** agree initial settings/device/sample schemas and cross-language examples; create root tooling and mock-capable Python packaging and `/health`. Person 3 and Kripa can consume contract examples immediately.
2. **Essential, mock-connected:** implement explicit mock/replay adapters, bounded receive buffers, auth, snapshots, derived stream and device health; source stays `synthetic` or `recorded`. This unblocks consumer transport before the board exists.
3. **Parallel physical track:** identify chip and electrical bus, independently scan, measure data-ready/fresh-rate and prove installed bridge; board-to-laptop connectivity is a separate gate.
4. **Essential integration:** agree exact `steadyhand_signal` exports with Person 4, run bounded analysis windows and calibration rejection, then replace adapter with verified live acquisition. No new numerical algorithm in service.
5. **Essential release:** sessions/export if consumer needs evidence, launch/restart instructions and reproducible packaging.
6. **Optional P1:** opt-in haptics after compatible actuator/driver and independently enforced off deadline; polish only after P0 behaves honestly.

### Milestones

- [ ] Contract fixtures pass in TypeScript and Python; malformed counterparts fail.
- [ ] Mock `/health` and authenticated snapshot work; reconnect and stalled sensor are distinct from healthy transport.
- [ ] Sensor identity, electrical checks, bus scan and installed MCU/Linux bridge round trip recorded.
- [ ] One actual schema-valid live batch with fresh rate, reboot ID, counters and laptop reachability recorded.
- [ ] Person 4's real library import analyzed on valid and invalid windows; calibration rejects poor evidence.
- [ ] Non-personal event deduplication and session export verified, if included in release.
- [ ] Optional actuator verified off at boot and on disconnect; dirty windows cannot recommend.
- [ ] Setup commands, lint/build/tests and second-person launch actually executed and reported.

## Teammate handoff

| Consumer | First artifact | Later agreement or dependency |
| --- | --- | --- |
| Kripa | Source/quality/null examples, endpoint error and calibration-state fixtures | Snapshot shape, re-pairing and actual dashboard transport |
| Person 3 | `@steadyhand/contracts` exports, mock stream endpoint, auth/reconnect rules | Worker subscription, content derived-only routing and no haptic replay |
| Person 4 | Acquisition timestamp/`g`/loss metadata and clean-window conditions | Exact `steadyhand_signal` import, result types, calibration validity and pulse blanking |
| Dev | Analysis typed exports and actual sensor capability data | Recordings remain labeled and compatible with agreed replay schema |

## Verification gates, open decisions and fallbacks

The [hardware plan](../hardware.md) and [build record](../../firmware/unoq/build-record.md) are design/reference and pending evidence respectively, not proof of a specific sensor, bus, SDK method, motor, or laptop route. First inspect markings and voltage/pull-ups, then verify official UNO Q bus routing on the actual revision, scanner and identity; choose the matching driver only afterwards. Prove MCU/Linux bridge round trip against installed packages before coding its adapter. Verify SSH forward or another supported route on the laptop; USB alone is not a service endpoint. No motor means capability false and no claimed pulse. If board access fails, retain labeled synthetic/recorded demonstrations and local extension assistance.

**Unresolved contract decisions; request agreement before source implements them:** field-specific clamp versus reject, ambiguity margin bounds and settings revision/patch rules (Dev, Person 3, Kripa, Person 4); WS `state.snapshot`, `device.health`, subscriptions, auth replies, heartbeat deadline, and raw-view authorization (Dev, Person 3, Kripa); pairing expiry/re-pair/route coverage (same); exact `steadyhand_signal` import, typed `MotionResult`/`CalibrationResult`, configuration and unit conversions (Dev, Person 4); intentional calibration phase semantics, rejection payloads (Dev, Person 4, Kripa); sessions event/export shapes, retention/dedup scope, and separate pointer-input versus sensor source (Dev, Kripa, Person 4); haptic ack/pulse/error correlation and boot/timebase uncertainty (Dev, Person 3, Person 4). Until agreement, documents describe boundaries rather than freezing competing payloads.

**Shared-document proposals only; do not modify others' files in this branch:** the root team file is `01_dev.md`, despite README/bridge README pointing to `teams/01_dev.md`; proposed tree also lists the latter. Update those links with their owners later. Person 4's planning branch proposes analysis-side 32-bit time unwrapping, alternate example import/type names and a standalone recording schema; agree whether MCU emits already extended monotonic `t_us` as the canonical contract requires and how provenance is mapped before either side implements conflicting logic. Its backend integration example mentions Dev-owned serial/I2C communication even though acquisition is MCU-side via the verified UNO Q bridge; confirm that boundary before implementation. A proposed `operator_id` in recordings needs a privacy review against non-personal default. Person 4's proposals are not verified hardware facts. Coordinate their changes without editing Person 4's documents. `docs/contracts.md`, `docs/architecture.md`, `docs/hardware.md`, `docs/repository_tree.md` and shared READMEs remain untouched.

## First implementation-stage prompt

```text
Implement Dev Stage 1A as working code, not more planning. Read AGENTS.md,
README.md, plan.md, prompts/global.md, root 01_dev.md, docs/contracts.md,
docs/implementation/dev.md, packages/contracts/README.md and PLAN.md,
services/bridge/README.md and PLAN.md, and scripts/plans/workspace-and-environment.md.
Inspect the actual checkout and installed versions. Work only in
packages/contracts/**, services/bridge/**, scripts/** and Dev-owned root build
configuration. Preserve unrelated work; agree missing interface details with
affected owners rather than inventing a private protocol.
Implement the agreed AssistanceConfig runtime TS schema and type, canonical
device.hello/sensor.batch/motion.frame validation and matching Python models;
add identical valid/invalid JSON fixtures and cross-language validation.
Package an installable Python FastAPI service with GET /health returning only
version and uptime. Use strict types, bounded sample batches, finite values,
safe timestamps and honest source labels; reject malformed input. Establish
real dependency versions and runnable lint, typecheck, fixture and health
checks in the actual environment. Do not implement WS, board APIs, analysis
algorithms or motor control in this stage. Handoff exact imports, fixture
paths, actual setup and launch commands, check results, unresolved decisions
and the next mock-service stage. Mark hardware/browser checks unrun.
```

This plan reports no application checks as passed; the documentation validation and Git handoff are reported separately when actually performed.
