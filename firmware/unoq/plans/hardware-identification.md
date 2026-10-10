# Sensor and bus identification gate

## Purpose and boundaries

Identify the actual Grove accelerometer and electrically safe UNO Q bus before selecting a chip driver. Scanner/diagnostics are independently implementable after power/bus safety checks; a vendor name is not evidence of chip identity.

## Current state

[Build record](../build-record.md) reports sensor model/revision, driver, bus, supply and measured fresh rate pending. [Hardware guide](../../../docs/hardware.md) lists *examples* LIS3DHTR/ADXL345/MMA7660FC, not this device's identity. No board inspection performed here.

## Exact proposed files

Existing `firmware/unoq/{README.md,build-record.md}` (preserve, later add measured facts to record). Planned `steadyhand/steadyhand.ino` diagnostic build mode for selected-bus scanner and chip identity read after model evidence; `steadyhand/sensor_driver.h/.cpp` **only after** identity and matching datasheet. A separate diagnostic sketch is proposed only if actual installed toolchain mandates it. Wiring photos/captures reside in Person 4's evidence sector by coordination, not fabricated here.

## Interfaces and data flow

Inspect board printing/chip marking and revision, use matching datasheet, official UNO Q pinout and actual connector pin order. Verify module supply/pull-up compatibility at **3.3 V I2C** before energizing; compare header `Wire` and Qwiic `Wire1` route documented in [hardware](../../../docs/hardware.md#2-identification-and-wiring-gate) against the physical board/core. Scanner observes address and identity register; metadata maps to [device.hello](../../../docs/contracts.md#6-device-and-sample-frames) only after configured ODR/range known.

## Concrete identification procedure

Driver selection is **blocked** until this procedure produces a datasheet match. Work through it in order and write each observation into [build-record.md](../build-record.md) with date, board/core/library versions, and the evidence location (photo/scan output).

1. **Unpowered inspection.** Photograph both sides of the Grove module and the UNO Q. Record the module part number and revision printed on the PCB, the chip marking (laser-etched code, not the Grove family name), the connector type, and the UNO Q board revision/silkscreen. Do not infer the chip from "Grove 3-axis accelerometer".
2. **Documentation lookup.** Match the exact part/marking against (a) the official Arduino UNO Q documentation for board revision, pinout, and the supported MCU↔Linux bridge, (b) the Seeed Studio wiki page for that exact Grove module SKU (supply, bus, address, supported library), and (c) the chip vendor datasheet for the die marking (addresses, WHO_AM_I/DEVID if defined, ranges, ODRs, resolution). Record the doc URLs and the revision/date of each page in the build record.
3. **Supply and levels.** Verify the module's documented supply requirement; use the 3.3 V-compatible supply and 3.3 V I2C pull-ups only. If the only safe configuration cannot be established from the docs and the physical board, stop and report rather than powering it.
4. **Connector and bus.** Confirm connector pin order from the module and board docs (do not trust wire colors). Prefer the header `Wire` route (SDA D20/PB11, SCL D21/PB10) when the verified library assumes `Wire`; use Qwiic `Wire1` (SDA PD13, SCL PD12) only with the correct Grove adapter and a driver that supports `Wire1` on the actual core.
5. **Address scan.** Compile/run the bounded scanner on the selected bus; compare the observed address with the datasheet default (candidates: LIS3DHTR `0x19`/`0x18`, ADXL345 `0x53`, MMA7660FC `0x4C` — examples, not identity). Multiple or unexpected addresses block driver selection.
6. **Identity register.** Where the datasheet defines an identity register, read it and compare with the documented value; record the observed value. If the chip has no identity register, identity rests on the part marking plus address plus datasheet-supported behavior.
7. **Configuration facts.** From the matched datasheet, record the supported range, ODR, and resolution options; configure range/ODR/resolution explicitly in the later acquisition stage and measure the actual fresh-sample rate (a fast poll loop can repeat old readings).
8. **Library selection.** Choose only the library matching chip + core + UNO Q bridge, record its exact name/version/source, and verify it is actually installed in the toolchain. Do not invent function names or copy an unverified vendor example.
9. **Blocked rule.** If marking is unreadable, the address probe is ambiguous, or no datasheet match exists, stop with a raw diagnostic report and keep the project on the synthetic/recorded fallback. Do not guess a driver, ODR, or wiring.

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
