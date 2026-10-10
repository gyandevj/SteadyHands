# UNO Q hardware and sensing plan

**Owner: Dev.** Person 4 helps validate signals and artifacts. Extension functionality must remain usable while this work proceeds.

## 1. What we actually know

The team has an Arduino UNO Q and a Grove digital three-axis accelerometer. The exact sensor chip and board revision are not yet identified. A vibration actuator and driver are not established inventory. Do not invent a motor, sensor identity, or verified connection in generated code or the pitch.

A motion sensor measures input. Haptic feedback requires output hardware. The P0 hardware deliverable is a trustworthy live motion stream; motor feedback is P1.

## 2. Identification and wiring gate

Read both sides of the sensor board, photograph the marking, and choose its matching datasheet and driver. Common variants:

| Sensor | Typical address | Starting rate | Important limitation |
| --- | --- | --- | --- |
| LIS3DHTR | `0x19`, sometimes `0x18` | Documented 100 Hz mode | Verify resolution and measurement scale |
| ADXL345 | Commonly `0x53` | Documented 100 Hz mode | Verify range and full-resolution settings |
| MMA7660FC | `0x4C` | Supported 120 Hz setting | Six-bit output may miss subtle motion |
| Other | Consult matching datasheet | Consult matching datasheet | Do not choose a driver from the generic Grove name |

UNO Q is not wired like a conventional UNO R3. Use its own official pinout. For this project use 3.3 V-compatible sensor power and 3.3 V I2C pull-ups, after checking the actual module's supply requirement.

| Connection option | Signals | Bus |
| --- | --- | --- |
| Header SDA/SCL | SDA D20/PB11; SCL D21/PB10; GND; appropriate 3.3 V supply | `Wire` |
| Qwiic | SDA PD13; SCL PD12; GND; 3.3 V | `Wire1` |

Choose the header route if the verified library assumes `Wire`. Qwiic needs the correct Grove adapter and a driver that supports `Wire1`. Confirm connector pin order; do not rely on wire colors or force unlike connectors together. Check pull-ups and supply before applying power. Do not connect a 5 V pull-up bus to this setup.

## 3. Bring-up sequence

1. Verify model, revision, supply, bus, and connection labels while unpowered.
2. Set up UNO Q using the supported environment and record versions.
3. Run the chosen bus's I2C scanner. Check device identity where available.
4. Configure range, output data rate, and resolution explicitly.
5. Read coherent XYZ samples and timestamp acquisition. Check gravity/orientation and measurement units.
6. Prove fresh sample updates at the chip's actual rate. A fast polling loop can repeat old readings.
7. Prove one MCU/Linux bridge method and one bounded sample batch.
8. Feed the real adapter into the same service used by the mock adapter.
9. Test sensor unplug, bus error, queue overflow, and MCU restart.

Do not use long delays copied from console-oriented vendor examples in the acquisition loop. Do not assume an unverified Python bridge API or USB serial endpoint.

## 4. Firmware responsibilities

Use a fixed-size ring buffer and batches of approximately 10 samples, capped by the contract. Sampling cannot wait for bridge calls, networking, or UI. Data includes sequence, MCU time, XYZ in `g`, validity, saturation, motor activity, and cumulative error/loss counters.

Use data-ready behavior where supported, coherent burst reads, bounded I2C timeouts, and a wrapping-safe monotonic clock. A restart creates a new boot ID and invalidates analysis/calibration. Track queue overflow rather than silently losing samples.

Logical bridge methods: `device_info`, `drain_samples`, `device_health`, and optional `queue_haptic`. Callbacks validate and enqueue, then return. Avoid nested blocking RPC from inside a bridge callback. Service drains bounded batches rather than making one synchronous RPC per sample.

## 5. Mounting and interpretation

Start with the sensor securely mounted to the mouse, UNO Q on the desk, and a slack cable with strain relief. This makes movement easier to compare with pointer input. A removable hand strap is another test configuration if comfortable, but it measures movement at that location rather than screen intent.

Fix the mount during a session. Cable tugs, loose mounting, rotation/gravity, and desk impacts alter readings. Do not double-integrate acceleration to obtain cursor position. Keep the mouse as the screen-coordinate input.

## 6. Optional selection haptic

Only add an actuator after confirming inventory and a compatible driver. A bare DC vibration motor requires appropriate switching, protection, supply, and decoupling; a resonant actuator may need a specialized driver. Use the chosen module's documented circuit and 3.3 V control compatibility. Do not power a bare motor from a GPIO.

Initial protocol limits: opt-in, 40 ms cue, maximum 80 ms, one-second cooldown, recent-command deduplication. MCU output starts off and has an independent stop deadline. A network or browser failure cannot leave it on.

The motor will affect acceleration measurements. Send pulse timing, suppress new recommendations immediately on forwarding a request, mark pulse plus initially 500 ms settling, discard overlapping analysis windows, and refill a full clean window. Measure the needed settling for the actual mount. Disable the motor if artifacts remain unmanageable. Repeated selection cues may keep analysis paused; display that honestly rather than fabricating continuously valid motion data.

Haptics confirm a selection. They do not physically cancel tremor or provide treatment.

## 7. Motion pipeline to integrate

Person 4 owns the Python implementation:

- Approximately 100/120 Hz fresh samples, sensor-dependent.
- A 2-second window, updated every 250 ms.
- Monotonic timestamps, finite values, loss/gap/saturation checks.
- Starting gates: missing fraction no more than 5%, gap no more than 40 ms, no haptic overlap. These are engineering assumptions to validate.
- Resample only acceptable short gaps using actual timestamps. No zero-filled long outages.
- Per-axis detrend, Hann window, normalized one-sided PSD, sum axis PSDs.
- Exploratory 3–12 Hz features: band RMS, power ratio, dominant frequency, concentration. Not a clinical boundary.
- Baseline/noise floor and persistence before a periodic-motion state. Low-energy peaks return unavailable values.

Invalid data never produces an assistance recommendation. A recommendation is advisory and accepted in the extension. Motion amplitude does not directly map to a pixel smoothing parameter.

## 8. Actual record

Fill [firmware build record](../firmware/unoq/build-record.md) with the exact chip, driver, configured/measured rate, address, bus, supply, mount, versions, data route, and actuator details. This record determines which hardware claims can appear in the final submission.
