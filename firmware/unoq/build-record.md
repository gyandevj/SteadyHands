# Actual hardware build record

**Owner: Dev.** Fill with measured/verified facts, not intended settings.

| Field | Actual value | Status / Notes |
| --- | --- | --- |
| Firmware source implemented | `firmware/unoq/steadyhand/` | Implemented (queue, driver interface, RPC, haptics) |
| Sensor model, marking, revision | Unidentified on physical board | Synthetic dev driver active; hardware driver unconfigured |
| Matching datasheet and driver/version | Pending physical chip marking | Scanner probe implemented |
| UNO Q environment/core/bridge versions | Host Python 3.13 / Node 24 | Arduino toolchain pending physical host hookup |
| Bus and address | Wire (D20/D21 header default) | Verified 3.3V I2C requirement |
| Supply and pull-up voltage | 3.3 V required | Verified in hardware spec; do not energize at 5V |
| Range/resolution/output data rate | 2.0 g / 12-bit / 100 Hz | Configured in firmware queue & contracts |
| Measured fresh rate and loss | Simulated 100 Hz, 0% loss | Physical capture pending hardware |
| Mount and orientation | Flat Z-up nominal | Documented |
| MCU/Linux method smoke test | Linux bridge reader implemented | Physical serial test pending board |
| Board-to-browser data route | Loopback WebSocket `/v1/stream` | Verified in automated smoke test |
| Actuator/driver and supply | Disabled by default | Physical motor not connected |
| Control pin, pulse limit, settling | Pin D9, max 80 ms, 1000 ms cooldown | Enforced in firmware & backend supervisor |
| Wiring photo and capture paths | Pending physical photo | Coordinated with Person 4 |
| Known limitations | Physical accelerometer unverified | Synthetic mode enables full stack operation |

Only completed entries support live hardware claims. Keep the record alongside source and evidence.
