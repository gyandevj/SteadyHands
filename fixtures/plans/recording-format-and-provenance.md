# Recording Format and Provenance Plan (`fixtures/plans/recording-format-and-provenance.md`)

**Owner:** Person 4 (Dedeepya) with Dev (Person 1)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document establishes the hardware provenance standards and file format for recorded accelerometer data. To ensure hackathon judges can verify the authenticity and engineering rigor of physical sensor data, every capture file must record full hardware provenance.

---

## 2. Canonical JSON Schema (`sensor_recording_v1`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SteadyHandSensorRecording",
  "type": "object",
  "required": ["provenance", "samples"],
  "properties": {
    "provenance": {
      "type": "object",
      "required": [
        "capture_id",
        "timestamp_utc",
        "operator_id",
        "source",
        "sensor",
        "hardware_setup",
        "protocol"
      ],
      "properties": {
        "capture_id": { "type": "string" },
        "timestamp_utc": { "type": "string", "format": "date-time" },
        "operator_id": { "type": "string" },
        "consent_verified": { "type": "boolean" },
        "source": { "type": "string", "enum": ["recorded"] },
        "sensor": {
          "type": "object",
          "required": ["model", "bus", "address_hex", "odr_hz", "range_g", "resolution_bits"],
          "properties": {
            "model": { "type": "string" },
            "bus": { "type": "string" },
            "address_hex": { "type": "string" },
            "odr_hz": { "type": "number" },
            "range_g": { "type": "number" },
            "resolution_bits": { "type": "integer" }
          }
        },
        "hardware_setup": {
          "type": "object",
          "required": ["board", "mount_location", "cable_strain_relief"],
          "properties": {
            "board": { "type": "string" },
            "mount_location": { "type": "string" },
            "cable_strain_relief": { "type": "string" }
          }
        },
        "protocol": { "type": "string" }
      }
    },
    "samples": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["seq", "t_us", "a_g", "valid", "saturated", "haptic_active"],
        "properties": {
          "seq": { "type": "integer" },
          "t_us": { "type": "integer" },
          "a_g": {
            "type": "array",
            "items": { "type": "number" },
            "minItems": 3,
            "maxItems": 3
          },
          "valid": { "type": "boolean" },
          "saturated": { "type": "boolean" },
          "haptic_active": { "type": "boolean" }
        }
      }
    }
  }
}
```

---

## 3. Provenance Validation Utility

Located at `fixtures/validate_recording.py`:
- Validates JSON files against the schema above.
- Verifies timestamp monotonicity: $t_{k} > t_{k-1}$ (handling 32-bit wrapping).
- Computes measured sample rate: $F_{measured} = \frac{N - 1}{(t_{last} - t_{first}) \times 10^{-6}}$.
- Checks that measured rate matches configured rate within $\pm 5\%$.

---

## 4. Acceptance Criteria

- Validation script passes on compliant files and rejects captures missing provenance headers.
- Zero personal identifying data contained in recordings.

---

## 5. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing recording schema and validation in fixtures/.

Read fixtures/plans/recording-format-and-provenance.md.

ALLOWED EDITS:
- fixtures/validate_recording.py
- fixtures/recorded/**

TASK:
1. Implement fixtures/validate_recording.py validating recorded JSON files against provenance schema and timestamp monotonicity.
2. Provide a sample valid recording template in fixtures/recorded/sample_template.json.
```
