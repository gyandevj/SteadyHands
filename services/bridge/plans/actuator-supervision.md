# Optional actuator supervision

## Purpose and boundaries

Dev validates opt-in cue requests, coordinates timing/uncertainty with firmware and blocks contaminated analysis. MCU independently enforces off at boot, dedup, cooldown and deadline. No driver/actuator exists in the recorded inventory yet; feature capability remains false.

## Current state

The [haptic contract](../../../docs/contracts.md#10-haptic-request) bounds request duration 1–80 ms, initial cooldown one second and MCU recent-ID dedup 64. [Build record](../../../firmware/unoq/build-record.md) lists actuator and driver as not established. There is no implementation.

## Exact proposed files

Existing: none. Planned `src/steadyhand_bridge/pipeline/haptic_supervisor.py`: validate capability, opt-in, command ID, duration/cooldown and uncertainty/blanking; `api/haptics.py`: protected request/ack route; `adapters/uno_q.py`: transport only after verified SDK; `models.py`: agreed ack/pulse/error; `tests/test_haptic_dedup.py`: service tests. Firmware off deadline in [haptic firmware plan](../../../firmware/unoq/plans/haptic-control.md).

## Interfaces and data flow

Only [canonical `haptic.request`](../../../docs/contracts.md#10-haptic-request) (`command_id`, 1–80 ms, `selection_confirmed`) is accepted; no GPIO/pin instructions. Ack means queued, not physical success; MCU pulse start/end use extended MCU microseconds with epoch ID. Block recommendation immediately on forwarding request and throughout uncertain delivery; settle initially 500 ms after measured pulse end, then require a full clean analysis window. Correlation/health event shapes and host↔MCU clock mapping need joint agreement with Person 3 and Person 4.

## Implementation sequence

1. Keep route rejecting with capability false; document absent hardware truthfully.
2. After verified actuator and driver, implement bounded MCU off/dedup first; measure pulse, settle and bridge command route.
3. Implement service validation, duplicate protection, cooldown and uncertainty/blanking.
4. Verify actual motor-off on transport loss and clean-window recovery with Person 4.

## Failure and recovery behavior

Reject disabled, unsupported, unknown reason, invalid duration, cooldown hit and duplicate ID. If ack lost, do not resend blindly; motor timeout remains independent of service. On reboot discard pending command and require motor-off confirmation before analysis can recover. Never turn an uncertain queued ack into `haptic.pulse` success.

## Acceptance checks

- No hardware: capability=false rejection, duplicate/cooldown validation, timeout and dirty-window simulation.
- Actual actuator: verify isolated driver, off-at-boot, 1–80 ms physical bounds, disconnect/reboot deadline, duplicate command one pulse and measured settling.
- Teammates: Person 4 overlapping-window rejection; Person 3 no replay after worker restart.

## Handoff

Person 3 receives request/ack/reject cases and false capability by default; Person 4 receives correlated actual pulse epoch/timing/uncertainty and a clean-window resume condition.

## Copy-ready implementation prompt

```text
Implement optional service cue supervision only after the firmware plan's
actuator/driver/off-deadline gates are physically verified. Read AGENTS.md,
README.md, plan.md, docs/contracts.md, docs/hardware.md, root 01_dev.md,
services/bridge/README.md, this plan and firmware/unoq/plans/haptic-control.md.
Allowed services/bridge/** and Dev-owned firmware/unoq/**, scripts/root config.
Agree ack/pulse/health fields with Person 3/4. Reject when unsupported/
disabled, dedup command_id, cap 1-80ms, enforce 1s cooldown and suppress
recommendations from forwarding through pulse+settle+full clean window.
MCU must independently force off and guard duplicates; ack != pulse. Run
formatter/linter, duplicate/timeout/blanking tests, firmware build and
physical deadline checks, explicitly marking unrun hardware checks. Handoff
actual measured pulse timing and capability state, not mock success.
```
