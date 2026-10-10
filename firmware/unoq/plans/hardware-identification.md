# Sensor and bus identification gate

## Purpose and boundaries

Identify the actual Grove accelerometer and electrically safe UNO Q bus before selecting a chip driver. Scanner/diagnostics are independently implementable after power/bus safety checks; a vendor name is not evidence of chip identity.

## Current state

[Build record](../build-record.md) reports sensor model/revision, driver, bus, supply and measured fresh rate pending. [Hardware guide](../../../docs/hardware.md) lists *examples* LIS3DHTR/ADXL345/MMA7660FC, not this device's identity. No board inspection performed here.

## Exact proposed files

Existing `firmware/unoq/{README.md,build-record.md}` (preserve, later add measured facts to record). Planned `steadyhand/steadyhand.ino` diagnostic build mode for selected-bus scanner and chip identity read after model evidence; `steadyhand/sensor_driver.h/.cpp` **only after** identity and matching datasheet. A separate diagnostic sketch is proposed only if actual installed toolchain mandates it. Wiring photos/captures reside in Person 4's evidence sector by coordination, not fabricated here.

## Interfaces and data flow

Inspect board printing/chip marking and revision, use matching datasheet, official UNO Q pinout and actual connector pin order. Verify module supply/pull-up compatibility at **3.3 V I2C** before energizing; compare header `Wire` and Qwiic `Wire1` route documented in [hardware](../../../docs/hardware.md#2-identification-and-wiring-gate) against the physical board/core. Scanner observes address and identity register; metadata maps to [device.hello](../../../docs/contracts.md#6-device-and-sample-frames) only after configured ODR/range known.

## Implementation sequence

1. Photograph both sensor board sides, record marking/part number, board revision, cable/connector and pinout while unpowered.
2. Confirm suitable supply, shared ground, pull-ups and 3.3 V-level compatibility; select header or Qwiic and toolchain board profile.
3. Compile/run scanner on **selected** bus; compare observed address with datasheet and check identity register when supported.
4. Select matching driver and record exact source/version; repeat scan/identity after unplug/replug.

## Failure and recovery behavior

Unknown voltage, mismatched connector or pull-ups blocks power-on. Multiple addresses or missing/mismatched chip identity blocks model-dependent code; report raw diagnostic outcome, not a successful hardware connection. I2C scan uses bounded transactions/timeouts and no motor pin output.

## Acceptance checks

- Without hardware: compile diagnostic if compatible UNO Q toolchain installed; never assert discovered device.
- Actual board/sensor: photographed identity, measured/verified supply/pull-ups, pin order, scan and identity register evidence; currently unrun.
- Teammates: Person 4 gets exact chip resolution and measured metadata after proof.

## Handoff

Fill `build-record.md` with marking, bus/address/supply, board/core versions, driver/datasheet link and evidence location; sensor acquisition implementation may start only when these gates close.

## Copy-ready implementation prompt

```text
Implement hardware identity diagnostics in firmware/unoq/** only. Read
AGENTS.md, README.md, plan.md, docs/hardware.md, docs/contracts.md, root
01_dev.md, firmware/unoq/README.md, build-record.md, PLAN.md and this plan.
Inspect actual parts unpowered and official revision-specific UNO Q pinout;
confirm 3.3V supply/pull-ups, ground and connector before power. Implement
only installed-toolchain-compatible selected-bus I2C scanner and identity
diagnostics, not speculative Grove driver or USB serial. Bound bus timeouts;
record actual scan/chip evidence, mismatches and supported build/flash steps.
Run formatter/build and physical scanner/identity checks if available; mark
unrun clearly. Handoff verified chip, bus, address, driver gate and photos.
```
