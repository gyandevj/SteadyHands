# UNO Q firmware

**Owner: Dev.** Read [hardware](../../docs/hardware.md), [contracts](../../docs/contracts.md), and [build record](build-record.md).

Identify the actual sensor before writing its driver. Select the correct 3.3 V-compatible supply and bus, prove scanner/identity/rate, then timestamp coherent samples and queue bounded batches. Acquisition cannot block on bridge/network.

Use the installed official MCU/Linux bridge API verified by a tiny round trip. An old UNO R3 serial sketch is not assumed compatible.

Optional motor requires verified actuator/driver hardware, off-at-boot, duration limit, deduplication, cooldown, and independent stop deadline. Report pulses so analysis can blank contaminated windows.

Document actual flash/build/run steps after testing. This package does not include compiled firmware or a verified circuit.
