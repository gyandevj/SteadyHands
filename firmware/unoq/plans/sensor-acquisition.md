# Fresh coherent sensor acquisition

## Purpose and boundaries

Turn a verified chip's fresh coherent three-axis acceleration into timestamped `g` samples without double-integrating motion or blocking on Linux/network delivery. Chip-independent buffer and host transport are planned separately.

## Current state

No identified chip, driver, configured range/resolution/ODR or fresh samples. [Hardware](../../../docs/hardware.md) gives candidate rates only; the actual board must decide. [Identity gate](hardware-identification.md) is open.

## Exact proposed files

Existing implementation: none. Planned `steadyhand/sensor_driver.h/.cpp`: verified model's identity/configuration, data-ready/validity, coherent burst-read XYZ, saturate flags and actual scale to `g`; `steadyhand/steadyhand.ino`: bounded schedule/acquire/enqueue and diagnostics. Queue/clock implementation lives in `sample_queue.{h,cpp}` per [buffer plan](sample-buffering.md), not in a second driver.

## Interfaces and data flow

Document exact selected bus/address, sensor register mode/range/resolution/ODR and formula/LSB conversion in `build-record.md`. Sensor fresh/data-ready condition -> coherent XYZ transaction -> MCU microsecond capture close to acquisition -> `a_g:[x,y,z]`, `valid`, `saturated`, `haptic_active`; attach monotonic sequence/boot/stream at queue boundary according to [contracts](../../../docs/contracts.md#6-device-and-sample-frames). Polling faster than ODR must never assign a new seq/timestamp to repeated old registers.

## Implementation sequence

1. After identity gate, choose driver supporting selected `Wire` or `Wire1` and configure exact range/resolution/ODR.
2. Implement bounded I2C read/timeout and coherent burst of all axes or documented chip latching.
3. Verify data-ready/new sample and actual unique timestamp cadence, orientation/gravity scale and saturation.
4. Enqueue fresh samples without waiting for drain; publish metadata and error counters.

## Failure and recovery behavior

Identity lost, unreadable status, bus timeout, repeated data-ready fault and implausible conversion increment counters, mark invalid/unavailable and yield control; do not duplicate last XYZ as new valid sample. Restart re-identifies/configures chip and rotates boot ID; a changed mount/range/ODR invalidates analysis/calibration. Queue overflow policy does not extend blocking time.

## Acceptance checks

- Without hardware: compile against *actual* installed driver and verify conversion logic from datasheet/reference vectors where applicable.
- Actual board: identity, orientation/gravity, fresh unique rate, deliberate motion, unplug, saturation and reboot captures; none verified yet.
- Teammates: Person 4 reviews quantization/ODR suitability, honest units and gap cases.

## Handoff

Backend gets `device.hello` actual sensor metadata and schema-valid live samples only after real bridge checks; Person 4 receives measured rate/quantization and mount/orientation data.

## Copy-ready implementation prompt

```text
Implement sensor_driver.h/.cpp and sampling hook only after identity evidence.
Read AGENTS.md, README.md, plan.md, docs/contracts.md, docs/hardware.md,
root 01_dev.md, firmware/unoq/README.md, build-record.md, this plan and
hardware-identification.md. Allowed firmware/unoq/** and Dev scripts/root
config. Select driver matching *actual* chip and bus; explicitly configure
range/resolution/ODR, verify identity/data-ready, read coherent XYZ with
bounded I2C timeout and convert to g. Do not treat repeated registers as
fresh or derive cursor coordinates. Run formatter/build, reference conversion
and actual gravity/rate/unplug tests if available; hand off capture, counters,
units, driver version and unverified cases.
```
