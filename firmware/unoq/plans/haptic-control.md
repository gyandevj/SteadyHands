# Optional safe actuator firmware

## Purpose and boundaries

Only after verifying actual actuator, driver, supply and control pin, add a short opt-in selection-confirmation cue. No bare motor from GPIO, treatment claim or automatic tremor-cancellation mechanism.

## Current state

[Hardware record](../build-record.md) says actuator/driver not established. No motor circuit, GPIO mapping, pulse test or firmware exists; `capabilities.haptics` must remain false.

## Exact proposed files

Existing `build-record.md` contains pending fields. Planned `steadyhand/haptic_control.h/.cpp`: disabled-by-default capability, startup-off output, ID dedup ring of latest 64/boot, 1–80 ms limit, one-second cooldown, independent MCU stop deadline and pulse event metadata; `steadyhand/bridge_rpc.cpp`: validated enqueue only, not blocking pulse; `steadyhand/steadyhand.ino`: loop invokes deadline check regardless of link; service supervisor in [service plan](../../../services/bridge/plans/actuator-supervision.md).

## Interfaces and data flow

`haptic.request` in [contracts](../../../docs/contracts.md#10-haptic-request) carries command ID, duration and reason; only enabled verified driver is allowed. MCU queued ack != executed pulse. Pulse start/end extended MCU µs, boot ID and uncertainty map to Person 4's analysis blanking; block immediately when service forwards, initially 500 ms settling after actual end and full clean two-second window thereafter. Correlation/event payload remains unresolved with Person 3/Person 4.

## Implementation sequence

1. Inspect inventory, schematic/driver datasheet, electrical isolation/protection/power/3.3 V logic; otherwise stop with false capability.
2. Configure output off before bridge startup and watchdog-like deadline independent of host callback; prove no drive on reset.
3. Implement bounded dedup/cooldown/pulse and event timing; replay duplicate after ack loss yields no extra pulse.
4. Measure physical timing/settling/mount artifacts and jointly validate Person 4 clean-window recovery.

## Failure and recovery behavior

Invalid ID/reason/duration, unsupported/disabled, duplicate, queue full or cooldown reject before output. Link loss cannot extend motor-on deadline; MCU restart turns output off and changes boot ID. If pulse outcome uncertain, analysis stays blocked until off is verified and a complete clean window accrues. No success claim from queued ack alone.

## Acceptance checks

- Without hardware: false capability, simulated duplicate/cooldown/deadline logic and schema validation; not physical proof.
- Actual motor/driver: supply and switch inspection, off at boot/reboot/disconnect, maximum measured pulse and repeated-ID single pulse, measured settling.
- Teammates: Person 4 invalidates overlapping analysis windows; Person 3 worker never replays cue.

## Handoff

Give backend actual capability, verified circuit/pin/versions, pulse/health events and physical timeout result; otherwise state haptics unavailable and use visual confirmation.

## Copy-ready implementation prompt

```text
Implement optional actuator control only after actual motor AND compatible
driver circuit are recorded. Read AGENTS.md, README.md, plan.md,
docs/contracts.md, docs/hardware.md, root 01_dev.md, firmware/unoq/README.md,
build-record.md, this plan and service actuator-supervision.md. Allowed
firmware/unoq/**, services/bridge/** and Dev-owned scripts/root config.
Keep capability false until physical verification; never drive bare motor
from GPIO. Implement startup off, independent stop deadline, 1-80ms pulse,
one-second cooldown, last-64 per-boot command dedup, separate ack and actual
pulse timing. Fail closed on uncertain outcome; Person 4 must blank and wait
for clean window. Run installed formatter/build, simulated dedup and actual
power/deadline/settling checks where possible; hand off measured proof or
explicit unavailable status.
```
