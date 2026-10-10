# Recorded Sensor Traces Plan (`fixtures/recorded/PLAN.md`)

**Owner:** Person 4 (Dedeepya) with Dev (Person 1)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This directory houses actual physical sensor traces recorded from the Arduino UNO Q and Grove accelerometer. It provides realistic hardware data—including electrical noise, cable strain artifacts, physical tapping, and voluntary rhythmic motion—to test the signal processing pipeline before final live integration.

---

## 2. Ethical Guidelines & Data Privacy

1. **Non-Personal Data:** Recorded traces contain only raw accelerometer time-series and hardware flags. No camera video, audio, personal identity, medical diagnoses, or form entries are stored.
2. **Informed Operator Consent:** Any teammate or voluntary participant contributing physical sensor recordings must provide explicit verbal/written consent.
3. **Neutral Labeling:** Physical rhythmic movements (e.g. holding the mouse while deliberately oscillating at $\sim 5\text{ Hz}$) must be labeled **"Deliberate rhythmic motion benchmark"**. They must NEVER be described as "simulated Parkinson's disease" or "pathological tremor data".

---

## 3. Recording Metadata Schema

Every recorded file (`.json`) must include a comprehensive hardware provenance header:

```json
{
  "provenance": {
    "capture_id": "rec-20261010-unoq-01",
    "timestamp_utc": "2026-10-10T16:00:00Z",
    "operator_id": "anon-op-04",
    "source": "recorded",
    "sensor": {
      "model": "LIS3DHTR",
      "bus": "Wire",
      "address_hex": "0x19",
      "configured_odr_hz": 100.0,
      "measured_odr_hz": 99.8,
      "range_g": 2.0,
      "resolution_bits": 12,
      "units": "g"
    },
    "hardware_setup": {
      "board": "Arduino UNO Q",
      "bridge_version": "RouterBridge v1.0",
      "mount_location": "firmly_taped_top_shell_mouse",
      "cable_relief": "slack_secured_to_desk"
    },
    "protocol": "stationary_rest_then_slow_sweep"
  },
  "samples": [
    { "seq": 1, "t_us": 1000, "a_g": [0.012, 0.005, 0.998], "valid": true, "saturated": false, "haptic_active": false }
  ]
}
```

---

## 4. Planned Recording Scenarios

1. `stationary_mouse_desk.json`: Mouse resting untouched on wooden desk for $10\text{ s}$.
2. `slow_deliberate_aiming.json`: Operator slowly navigating across small buttons.
3. `deliberate_rhythmic_sweep.json`: Operator voluntarily oscillating mouse at $\sim 5\text{ Hz}$.
4. `desk_tap_impact.json`: Physical impact vibration from tapping near the mouse.
5. `sensor_unplug_reconnect.json`: Physical I2C disconnection mid-stream.

---

## 5. Acceptance Criteria

- All recorded files strictly validate against schema.
- Replaying files through Dev’s replay adapter reproduces original sample stream bit-for-bit.

---

## 6. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing recorded trace schemas in fixtures/recorded/.

Read fixtures/recorded/PLAN.md and docs/contracts.md.

TASK:
1. Provide recorded trace JSON validation schema in fixtures/recorded/schema.json.
2. Create sample capture templates with complete hardware provenance metadata.
```
