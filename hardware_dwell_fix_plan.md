# Implementation Plan: Fix Dwell Timer Stalling & Waveform Stream Stalling

## 1. Goal Description
The user reported two specific bugs:
1. **Dwell circle is not fully loading when moving left/right on a form**: The dwell countdown indicator starts but cancels/resets mid-progress before finishing its selection circle.
2. **Diagnostics monitor waveform is not visible**: When opening `apps/fixtures/monitor.html` and moving the physical sensor, no waveform appears on the oscilloscope.

---

## 2. Root Cause Analysis

### Cause 1: Dwell Timer Stalling (The "Circle Not Loading" Bug)
* **Location**: `apps/extension/src/content/runtime.ts` and `apps/extension/src/content/engineStub.ts`
* **Mechanism**:
  1. In `engineStub.ts`, the `applyConfig(config)` method explicitly calls `this.cancel('config_applied')`:
     ```typescript
     applyConfig(config: AssistanceConfig): void {
       this.config = { ...config };
       this.cancel('config_applied'); // <-- Wipes out active dwell timer!
     }
     ```
  2. In `runtime.ts`, `msg.type === 'device.state'` is received from the background worker every ~250 ms.
  3. The handler was calling `this.engine.applyConfig(this.config)` in the `else` branch (or whenever resting) on **every single message** (every 250 ms).
  4. Because a standard dwell click takes 600–800 ms, having `applyConfig` call `cancel()` every 250 ms continuously **aborted the dwell countdown** before it could ever complete!
* **Resolution**:
  - In `engineStub.ts`: Decouple pointer filter smoothing updates from the dwell selection state machine. Do not abort active dwell progress when only filter smoothing parameters (`min_cutoff_hz`, `beta`) are dynamically adjusted.
  - In `runtime.ts`: Only update filter configuration if the parameters actually changed by a significant delta ($\Delta > 0.05$), avoiding spurious updates.

---

### Cause 2: Waveform Not Visible on Monitor (Serial Stream Stall)
* **Location**: `firmware/unoq/steadyhand/steadyhand.ino`, `bridge_rpc.cpp`, and Arduino USB CDC buffer
* **Mechanism**:
  1. The Arduino UNO R4 WiFi uses native USB CDC managed by the Renesas RA4M1 microcontroller.
  2. In `bridge_rpc.cpp`, `Serial.print(...)` flushes JSON packets (~650 bytes per flush at 10 Hz) directly without checking `Serial.availableForWrite()`.
  3. When the USB connection is closed, opened, or if the host CDC receiver temporarily stops reading, the hardware USB FIFO fills up.
  4. On the Renesas core, once the USB CDC buffer is full, subsequent `Serial.print()` calls **block indefinitely**.
  5. In addition, `bridge_rpc.cpp` called `String line = Serial.readStringUntil('\n')`, which has a 1000 ms default timeout blocking the embedded loop whenever partial bytes appear.
  6. When `Serial.print()` blocked, `loop()` froze on the MCU, stopping all serial batch transmission (`total_samples` froze at 232).
* **Resolution**:
  - In `bridge_rpc.cpp`: Guard serial writing with `if (Serial && Serial.availableForWrite() >= 64)` so flushing is 100% non-blocking.
  - In `bridge_rpc.cpp`: Replace blocking `readStringUntil('\n')` with non-blocking byte reads from `Serial.read()`.
  - In `steadyhand.ino`: Add a short watchdog/reconnect check for USB CDC.
  - Hardware Reset: If the microcontroller USB CDC is currently in a hung state, perform a clean reset (press reset button or quick replug) so the fresh firmware runs.

---

## 3. Proposed Changes

### Component 1: Extension Runtime & Engine (`apps/extension/`)

#### [MODIFY] `apps/extension/src/content/engineStub.ts`
- Separate `applyFilter(filterConfig)` from full `applyConfig(config)` so updating smoothing parameters never cancels an in-flight dwell:

```typescript
  applyFilterConfig(filter: FilterConfig): void {
    this.config.filter = { ...filter };
    // Dwell timer is NOT cancelled - only pointer smoothing adjusts!
  }

  applyConfig(config: AssistanceConfig): void {
    const dwellChanged = (
      this.config.mode !== config.mode ||
      this.config.dwell.enabled !== config.dwell.enabled ||
      this.config.dwell.duration_ms !== config.dwell.duration_ms
    );
    this.config = { ...config };
    if (dwellChanged) {
      this.cancel('config_applied');
    }
  }
```

#### [MODIFY] `apps/extension/src/content/runtime.ts`
- Track `lastAppliedCutoff` and `lastAppliedBeta`.
- Only call `engine.applyFilterConfig()` when the values change by more than `0.02`:

```typescript
    } else if (msg.type === 'device.state') {
      this.deviceSource = msg.source || 'unavailable';
      if (msg.motion) {
        this.deviceMotion = msg.motion.status || 'quiet';
        this.dominantHz = msg.motion.dominant_hz ?? null;
        const bandRms = msg.motion.band_rms_g ?? 0;

        if (this.config.mode === 'stabilized') {
          let targetCutoff = this.config.filter.min_cutoff_hz;
          let targetBeta = this.config.filter.beta ?? 0.015;

          if (this.deviceMotion === 'periodic_motion') {
            targetCutoff = Math.max(0.3, 1.0 - (bandRms * 4.0));
            targetBeta = Math.max(0.002, 0.015 - (bandRms * 0.05));
          }

          if (
            Math.abs(targetCutoff - this.activeCutoff) > 0.05 ||
            Math.abs(targetBeta - this.activeBeta) > 0.002
          ) {
            this.activeCutoff = targetCutoff;
            this.activeBeta = targetBeta;
            this.engine.applyFilterConfig({
              ...this.config.filter,
              min_cutoff_hz: targetCutoff,
              beta: targetBeta
            });
          }
        }
      }
    }
```

---

### Component 2: Firmware Serial & RPC Reliability (`firmware/unoq/steadyhand/`)

#### [MODIFY] `firmware/unoq/steadyhand/bridge_rpc.cpp`
- Guard `Serial.print` in `flush_batch`: verify `Serial` is connected and has buffer space (`Serial.availableForWrite() >= 64`), preventing FIFO lockups.
- Make `process_inbound` non-blocking: read into a static character buffer instead of allocating `String` and blocking on `readStringUntil('\n')`.

#### [MODIFY] `firmware/unoq/steadyhand/steadyhand.ino`
- Ensure `Serial.setTimeout(5)` is configured in `setup()`.
- Add non-blocking loop safeguards.

---

## 4. Verification Plan

### Automated Tests
1. **Extension Test Suite**:
   ```powershell
   npm --prefix apps/extension test
   ```
   Ensures dwell at-most-once invariant, cancellation, and geometry tests pass without regression.
2. **Bridge Test Suite**:
   ```powershell
   pytest services/bridge
   ```
3. **Signal Analysis Suite**:
   ```powershell
   pytest tests/analysis
   ```

### Manual Verification
1. **Dwell Loading Test**:
   - Open `apps/fixtures/registration.html`.
   - Hover cursor over form input fields and radio buttons.
   - Verify the dwell circle ring **smoothly and completely fills** to 100% and triggers selection, without stalling or resetting at 250 ms.
2. **Waveform & Hardware Stream Test**:
   - Re-flash / reset Arduino UNO R4 on `COM5`.
   - Start bridge daemon on `COM5`.
   - Open `apps/fixtures/monitor.html`.
   - Verify live multi-axis waveforms actively oscillate on the canvas.
   - Shake sensor and verify dominant frequency updates with "PERIODIC TREMOR".
