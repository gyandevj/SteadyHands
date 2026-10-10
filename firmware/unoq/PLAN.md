# UNO Q hardware and firmware plan

## Purpose and boundaries

Build an independently diagnosable, bounded MCU sensor acquisition system for Dev's local service. Acceleration is advisory and never becomes mouse coordinates. The optional actuator is separate from the accelerometer; do not assume it exists.

## Current state

[README](README.md) and [build record](build-record.md) exist; `steadyhand/` is empty. The sensor model, wiring, core version, installed MCU/Linux bridge, data route, ODR and any motor are unverified. See [master](../../docs/implementation/dev.md), [hardware](../../docs/hardware.md), and [contracts](../../docs/contracts.md).

## Exact proposed files

Existing: `README.md`, `build-record.md` (fill only measured evidence later). Planned [sketch and module files](steadyhand/PLAN.md): `steadyhand.ino`, `sensor_driver.{h,cpp}`, `sample_queue.{h,cpp}`, `bridge_rpc.{h,cpp}`, `haptic_control.{h,cpp}`. Focused plans: [identity](plans/hardware-identification.md), [acquisition](plans/sensor-acquisition.md), [buffering](plans/sample-buffering.md), [bridge](plans/mcu-linux-bridge.md), [haptics](plans/haptic-control.md), [physical checks](plans/bringup-and-verification.md). Scanner/diagnostic mode can be a bounded build mode in `steadyhand.ino`; add a separate sketch only if the installed toolchain requires it.

## Interfaces and data flow

Verified sensor via selected I2C bus -> coherent fresh XYZ in `g` + monotonic extended MCU `t_us`/sequence -> fixed ring -> bounded drain by verified bridge -> service adapter -> Person 4 analysis. `device.hello` and `sensor.batch` fields, counters, boot/stream IDs, units and <=50 samples/batch are specified in [contracts](../../docs/contracts.md#6-device-and-sample-frames); logical bridge method names in [hardware](../../docs/hardware.md#4-firmware-responsibilities) are not installed SDK function names. Do not claim UART/USB serial or UNO R3 A4/A5 wiring.

## Implementation sequence

1. Unpowered photograph/identify sensor, verify board revision, supply, connector, pull-ups and selected bus.
2. In a standalone scanner/diagnostic build, scan selected bus and check datasheet identity; independently verify installed MCU/Linux bridge by a bounded round trip.
3. Implement chip-matched configuration, coherent data-ready reading, measured cadence and fixed ring with wrap-safe timestamp/boot ID.
4. Drain batches to canonical live adapter, verify laptop route and physical fault/restart behavior.
5. Only if parts exist: implement motor driver, MCU off deadline and physically prove pulse/artifact behavior.

## Failure and recovery behavior

I2C timeout or identity mismatch marks sensor unavailable; no stale sample repeats treated as fresh. Overflow increments counters; bridge disconnect never blocks acquisition. MCU reboot changes boot ID, invalidates analysis/calibration and turns optional motor off. Physical motor-off is independent of Linux/service reachability.

## Acceptance checks

- No hardware: host-side queue/wrap/packet test harness and schema validation possible after source exists; not physical proof.
- Board/sensor: electrical inspection, scanner/identity, gravity/axis, unique ODR, wrap/reboot, queue loss and actual laptop stream; all currently unrun.
- Teammates: Person 4 reviews captured signal/settling; Person 3/Kripa consume live state after route proof.

## Handoff

Give backend verified `device_info`, bounded `drain_samples`, health/counters and boot epoch through actual installed bridge; hand Person 4 actual chip, measured fresh-rate, orientation, units and limitations. Record wire photo, versions and readings in `build-record.md`.

## Copy-ready implementation prompt

```text
Implement the UNO Q model-independent identification/diagnostics stage, not
model-specific sampling. Read AGENTS.md, README.md, plan.md, docs/contracts.md,
docs/hardware.md, root 01_dev.md, firmware/unoq/README.md, build-record.md,
this PLAN.md and plans/hardware-identification.md. Allowed firmware/unoq/**,
Dev-owned scripts/root config only. Inspect actual board/sensor markings,
official board revision/pinout, supply/pull-ups and installed toolchain;
choose safe bus, create independent I2C scanner/identity diagnostics and
record exact evidence. Do not guess chip/SDK/serial, drive motor or claim a
live stream. Check physical voltages, scan/identity and diagnostic build;
run available formatter/linter and report unrun checks. Handoff measured
board/bus/sensor facts and driver gate to acquisition stage.
```
