# Arduino UNO Q Firmware (steadyhand)

**Owner: Dev.** Conforms to [hardware](../../docs/hardware.md) and [contracts](../../docs/contracts.md).

## Firmware Architecture

- `steadyhand.ino`: Main sketch with 100 Hz coherent sampling cadence, 100 ms / 10-sample batched transport, and boot identity generation.
- `sensor_driver.h`, `sensor_driver.cpp`: Sensor driver interface with:
  - `UnconfiguredHardwareSensorDriver`: Bounded I2C scanner probing selected bus and identity registers (`WHO_AM_I`). Keeps acquisition explicitly unavailable until physical chip die marking is confirmed.
  - `SyntheticDevelopmentSensorDriver`: Clearly labeled synthetic acquisition mode for firmware timing, queueing, and bridge round-trip verification.
- `sample_queue.h`, `sample_queue.cpp`: Fixed 64-sample static ring buffer in SRAM (zero heap allocation during sampling). Wraparound-safe 64-bit microsecond extension (`extend_micros`). Drop-oldest overflow policy to preserve fresh state, with drop and overflow counters.
- `bridge_rpc.h`, `bridge_rpc.cpp`: RPC transport formatting canonical `sensor.batch` JSON messages, `device.hello`, and parsing `haptic.request` commands.
- `haptic_control.h`, `haptic_control.cpp`: Actuator controller disabled by default, enforcing bounds [1, 80] ms, 1-second cooldown, duplicate command ID deduplication (64-slot ring buffer), and automatic hardware shutoff. (WARNING: Do not drive a bare motor directly from GPIO; requires a dedicated driver circuit).
- `linux/bridge_reader.py`: Host/Linux bridge receiver script.

## Building and Flashing

With the Arduino IDE or `arduino-cli`:
```bash
# Verify sketch
arduino-cli compile --fqbn arduino:renesas_uno:unor4_wifi firmware/unoq/steadyhand

# Upload sketch
arduino-cli upload -p COM3 --fqbn arduino:renesas_uno:unor4_wifi firmware/unoq/steadyhand
```

## Hardware Identification Status

See [build-record.md](build-record.md) for the identification checklist. Physical sensor driver will be configured upon laser-etched chip marking confirmation.
