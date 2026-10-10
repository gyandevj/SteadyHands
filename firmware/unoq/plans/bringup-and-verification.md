# Physical bring-up and verification record

## Purpose and boundaries

Provide a reproducible evidence trail from wiring through browser connectivity. The [build record](../build-record.md) holds actual measurements; Person 4 owns evidence assets and signal interpretation. No test here is marked passed by writing its plan.

## Current state

All relevant build-record fields are pending. No photos, chip marking, scan, flash, actual samples or laptop route are present in this checkout. Initial read-first materials: [UNO Q README](../README.md), [hardware](../../../docs/hardware.md), [architecture](../../../docs/architecture.md).

## Exact proposed files

Existing: `firmware/unoq/build-record.md`, `README.md` (update only with verified build instructions). Planned `steadyhand/steadyhand.ino` diagnostic/acquisition modes plus driver/queue/bridge modules specified by [sketch plan](../steadyhand/PLAN.md); `scripts/dev-service.sh` with tested board/laptop launch steps, `scripts/build-extension.sh` only after Person 3 provides actual build. Person 4 owns photos and captures in `evidence/`/`fixtures/`, coordinated handoff rather than Dev edits.

## Interfaces and data flow

Record model/revision, verified bus/power/address, selected driver/core/bridge versions, range/resolution/configured versus measured fresh Hz, mount/axis orientation, I2C/loss counters, boot/stream IDs and MCU `t_us`. Prove board MCU -> Linux bridge -> service -> authenticated laptop endpoint -> dashboard/worker derived state, with each hop separately observed. Never subtract unsynchronized MCU, Linux and browser clocks for latency claims.

## Implementation sequence

1. Unpowered wiring/voltage and identification; capture before power.
2. Board/core/tool installation and actual flash/launch procedure; scanner/address/identity proof.
3. Stationary and deliberate movement, unique-sample rate, overflow/unplug/reboot tests; retain sanitized capture.
4. Installed bridge round trip, schema-valid batch, board-local then laptop `/health` and authenticated stream.
5. If actuator exists, measure off deadline and settling; rehearse clean restart with teammate.

## Failure and recovery behavior

Do not power until voltage/pin compatibility confirmed. Wrong identity/ODR, repeated stale registers or no round trip blocks `live` claim; dashboard must show unavailable rather than synthetic success. Unplug/reboot invalidates calibration and windows; connectivity failure falls back to labeled mock/recorded path while extension stays local. Restore wiring/flash state between runs and keep no secret tokens in captures.

## Acceptance checks

- Without hardware: validate example JSON/wiring checklist and test mock route only; not a physical pass.
- Actual board/sensor: photos, scanner, scope/meter when applicable, gravity/rate, unplug/reboot/overflow, bridge and laptop routes; unrun now.
- Teammates: Person 4 rates signal windows; Person 3/Kripa validate actual browser endpoint; second-person fresh-start rehearsal.

## Handoff

Provide exact commands established in actual Arduino environment, software/firmware versions, wiring diagram/photo location, capture hashes/paths, observed failures, actual browser endpoint and which checks remain unrun. Write only verified measurements into `build-record.md`.

## Copy-ready implementation prompt

```text
Execute and document real UNO Q physical bring-up after identifying parts.
Read AGENTS.md, README.md, plan.md, docs/contracts.md, docs/hardware.md,
docs/architecture.md, root 01_dev.md, firmware/unoq/README.md,
build-record.md, this plan and other firmware focused plans. Allowed
firmware/unoq/**, services/bridge/** and Dev-owned scripts/root config; ask
Person 4 to own evidence files. Verify voltage/bus, scanner/identity,
driver/configured and measured fresh rate, MCU wrapping/boot, unplug,
bounded bridge packet, actual laptop endpoint and restart. Optional motor
requires independent physical off check. Run installed formatter/build,
service lint/tests and reproducible physical checks. Record actual commands,
versions/captures/results and unrun gates; never claim mock as hardware.
```
