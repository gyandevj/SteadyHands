# Canonical contracts, version 1

**Owner: Dev.** All four agree on this document in hour 1. Person 3 implements browser adapters; Person 4 implements numerical modules; Kripa consumes typed UI state. Changes require an explicit handoff to affected owners.

## 1. Shared vocabulary

- Sources: `live`, `recorded`, `synthetic`, `unavailable`.
- Quality: `warming_up`, `good`, `degraded`, `stale`, `haptic_blanking`, `unavailable`.
- Motion: `quiet`, `periodic_motion`, `other_motion`, `unknown`.
- Pointer mode: `native`, `stabilized`; dwell is a separate boolean. `raw_virtual` is an additional developer-only technical-test mode, never described as the OS cursor.
- Units: CSS pixels, milliseconds for UI, MCU microseconds for acquisition, `g` for acceleration, Hz for frequency.
- Missing metrics: `null`. Never NaN, invented zero, or a confident label from invalid data.

Use runtime schemas in `packages/contracts/src/` and corresponding Python models in the service. Generate one set of canonical JSON examples that both implementations validate. A shared document alone does not guarantee schema agreement.

## 2. Assistance configuration

```json
{
  "v": 1,
  "revision": 1,
  "mode": "stabilized",
  "filter": {"kind": "one_euro", "min_cutoff_hz": 1.0, "beta": 0.002, "derivative_cutoff_hz": 1.0},
  "target": {"capture_radius_px": 16, "ambiguity_margin_px": 8},
  "dwell": {"enabled": true, "duration_ms": 800, "rearm_ms": 300},
  "haptics_enabled": false,
  "show_raw_pointer": false
}
```

Numbers above are initial test values, not validated ideal settings. Clamp and reject invalid inputs. Starting ranges: positive cutoff 0.1–20 Hz, beta 0–1, capture radius 0–24 px, dwell 600–1500 ms, rearm 200–1000 ms. Tune bounds only with evidence. A single accepted revision replaces the configuration atomically.

P0 settings authority is the worker. The dashboard shows recommendations; acceptance happens in the popup. Device data cannot mutate this object directly.

### Labeled pointer stress test

The agreed developer test adapter may add seeded jitter to mouse samples before the pure engine. Compare `raw_virtual` bypass against `stabilized` using the same perturbation and geometry. `native` remains ordinary browser interaction. The test adapter runs only after explicit operator activation and always displays **Synthetic pointer stress test**. Pointer-input source and sensor-data source are separate labels, so a live accelerometer cannot make synthetic pointer input appear live.

This adapter changes virtual-pointer input inside the extension, not OS mouse position. Its seed/amplitude/settings appear in the evidence. Disable it before the real hardware/manual interaction segment.

## 3. Worker/UI/content messages

All messages contain `v`, `type`, and `request_id`. Replies contain the same request ID plus `ok`, `data`, and `error`. Timeouts are explicit.

| Type | Sender → receiver | Payload and behavior |
| --- | --- | --- |
| `page.enable` | Popup → worker | Active page requested; resolve current tab, check supported URL, inject once, reply with state |
| `page.disable` | Popup → worker → content | Disable that tab and acknowledge cleanup |
| `settings.get` | UI/content → worker | Return latest validated config |
| `settings.update` | Popup/options → worker | Config patch plus expected revision; validate, increment, persist, broadcast |
| `content.ready` | Content → worker | Document instance ID and capabilities; receive fresh snapshot |
| `content.status` | Content → worker | Enabled state, supported-target count, unsupported reason, no page text |
| `settings.applied` | Worker → content/UI | Complete config and revision, cancel/reset before applying |
| `device.state` | Worker → content/UI | Source, health, quality, derived motion, optional recommendation |
| `selection.confirmed` | Content → worker | Selection ID, allowed action kind, relative timing; no label or entered value |
| `transport.state` | Worker → content/UI | Connected/connecting/unavailable; cancel once on fault transition |

An internal `page.enable` message is not a backend API. Page scripts do not get an external messaging endpoint. Verify sender identity/context and use a top-frame tab ID supplied by Chrome, not a page-provided arbitrary tab ID.

## 4. Numerical TS interfaces

```typescript
type Point = { x: number; y: number; tMs: number };
type Rect = { x: number; y: number; width: number; height: number };
type Target = {
  id: string;
  rect: Rect;
  kind: 'focus' | 'toggle' | 'button';
  enabled: boolean;
  dwellAllowed: boolean;
};
type EngineInput = {
  raw: Point;
  targets: readonly Target[];
  geometryRevision: number;
  configRevision: number;
};
type EngineOutput = {
  pointer: Point;
  candidateId: string | null;
  ambiguous: boolean;
  dwellProgress: number;
  selection: { id: string; targetId: string } | null;
};
interface InteractionEngine {
  step(input: EngineInput): EngineOutput;
  cancel(reason: string): void;
  reset(point: Point): void;
  applyConfig(config: AssistanceConfig): void;
}
```

Implement or generate `AssistanceConfig` from the schema. The engine contains no DOM nodes, Chrome APIs, network calls, or timers tied to global state. Content supplies monotonic `performance.now()` timestamps and may step the engine on animation frames using the latest raw point so dwell progresses while the mouse is stationary.

Person 3 revalidates the selected DOM node at activation time: connected, visible, enabled, geometrically current, not occluded, and still policy-eligible. The engine's selection event is permission to attempt a single eligible action, not proof the DOM action succeeded.

## 5. Python analysis interface

```python
def analyze_window(samples, calibration, config) -> MotionResult:
    """Pure, bounded analysis; no device I/O or server."""

def calibrate_stationary(samples, sensor_metadata) -> CalibrationResult:
    """Return baseline and limitations, or a readable rejection."""
```

Use typed dataclasses or Pydantic-compatible data structures with no imported server. Document expected shape, units, timestamp behavior, and quality reasons in `analysis/README.md`. Service owns rolling buffers, adapter I/O, and event publication; analysis owns window validation and features.

## 6. Device and sample frames

```json
{
  "v": 1,
  "type": "device.hello",
  "source": "synthetic",
  "boot_id": "fixture-boot-1",
  "stream_id": "fixture-stream-1",
  "sensor": {"model": "LIS3DHTR", "bus": "Wire", "address_hex": "0x19", "odr_hz": 100, "range_g": 2, "units": "g"},
  "capabilities": {"haptics": false}
}
```

The model is an example, not the identity of the user's sensor.

```json
{
  "v": 1,
  "type": "sensor.batch",
  "source": "synthetic",
  "boot_id": "fixture-boot-1",
  "stream_id": "fixture-stream-1",
  "batch_seq": 12,
  "samples": [
    {"seq": 120, "t_us": 1200000, "a_g": [0.01, 0.005, 0.998], "valid": true, "saturated": false, "haptic_active": false},
    {"seq": 121, "t_us": 1210000, "a_g": [0.012, 0.004, 0.997], "valid": true, "saturated": false, "haptic_active": false}
  ],
  "counters": {"i2c_errors": 0, "dropped_samples": 0, "queue_overflows": 0}
}
```

Initially limit batches to 50 samples; aim for 10 per flush. Timestamps must increase within the stream, survive timer wrapping correctly, and stay within exact JSON/JS integer range. The service preserves acquisition timestamps and records receive time separately.

Raw batches go to analysis and an explicitly enabled dashboard debug view. The content script only receives derived frames.

## 7. Derived frame

```json
{
  "v": 1,
  "type": "motion.frame",
  "source": "synthetic",
  "boot_id": "fixture-boot-1",
  "stream_id": "fixture-stream-1",
  "frame_seq": 8,
  "window": {"start_us": 2000000, "end_us": 4000000, "fresh_samples": 200},
  "quality": {"state": "good", "reasons": [], "measured_hz": 100.0, "missing_fraction": 0.0, "max_gap_ms": 10.0},
  "motion": {"status": "periodic_motion", "dominant_hz": 5.0, "band_rms_g": 0.03, "band_power_ratio": 0.72, "peak_concentration": 0.65},
  "recommendation": {"id": "rec-2", "preset": "steady", "requires_user_acceptance": true, "reason_code": "persistent_motion_during_task"}
}
```

Emit around every 250 ms after a full clean window exists. Invalid quality yields unknown motion, null numerical motion fields, and null recommendation. An arriving packet is not proof of fresh samples. Start with 500 ms without a fresh sample as stale; tune against actual acquisition and transport.

## 8. HTTP API

| Method and path | Request | Response |
| --- | --- | --- |
| `GET /health` | No token needed; no sensitive fields | Service version and uptime only |
| `GET /v1/device` | Bearer token | Latest source, hello, health, capabilities |
| `POST /v1/calibration/start` | Phase `stationary` or `intentional`, request ID | Calibration session ID and accepted phase |
| `GET /v1/calibration/{id}` | Bearer token | Progress, quality, complete/rejected state, reasons |
| `POST /v1/calibration/{id}/finish` | Request ID | Baseline result and optional recommended preset |
| `POST /v1/haptics` | Bounded haptic request | Accepted/rejected with command ID |
| `POST /v1/sessions` | Non-personal session metadata | Session ID |
| `POST /v1/sessions/{id}/events` | Validated non-personal task events | Accepted event IDs; duplicate IDs ignored |
| `GET /v1/sessions/{id}/export` | Bearer token | JSON summary, no entered values |

Repeated phase-start requests with the same request ID must return the same session operation, not create duplicate acquisitions. Keep only bounded in-memory sessions initially. Persistent storage is optional.

Task events have event ID, task/trial ID, relative monotonic milliseconds, mode/settings revision, source, and an allowed kind: `task.started`, `task.completed`, `task.timeout`, `selection.dispatched`, or `selection.corrected`. Completion is supplied by explicit fixture/task instrumentation or the operator; the extension cannot infer successful completion of an arbitrary site's form from a dispatched click. Do not accept entered values, labels, HTML, or complete page URLs.

## 9. WebSocket handshake and events

`/v1/stream` starts unauthenticated. Client sends `client.auth` with the pairing token within three seconds. After validation, server sends `state.snapshot`. Both parties exchange `client.ping`/`server.pong` with request IDs, without confusing heartbeat health with sensor freshness.

Other server events: `device.hello`, `device.health`, `motion.frame`, `calibration.state`, `haptic.ack`, `haptic.pulse`, `command.error`. Dashboard may opt into raw batches; extension subscribes only to derived state. Maximum message size begins at 64 KiB. Reject oversized or malformed input.

On reconnect, request a fresh snapshot and reset hardware-derived state. No client replays clicks, selection events, or motor requests.

## 10. Haptic request

```json
{
  "v": 1,
  "type": "haptic.request",
  "command_id": "session-17-selection-4",
  "duration_ms": 40,
  "reason": "selection_confirmed"
}
```

Reject when disabled, unsupported, outside the initial 1–80 ms bounds, or within the one-second cooldown. MCU deduplicates the latest 64 IDs within a boot and enforces motor-off independently of network state.

Block new recommendations immediately when a cue is forwarded. Pulse events include MCU start/end times. Mark pulse plus initially 500 ms settling, reject all overlapping spectral windows, and wait for a full clean window. A timeout remains uncertain until health confirms off and clean evidence returns. An acknowledgment means queued, not necessarily executed.

## 11. UI adapters

Kripa exports `mountPopup(container, adapter)` and `mountOptions(container, adapter)` from their UI folders. Adapter capabilities are `getState`, `enablePage`, `disablePage`, `updateSettings`, `setConnection`, and `subscribe`, with cleanup functions. Person 3 provides real adapters; Kripa uses fake ones initially. UI components import no worker implementation files.

The dashboard has its own `DeviceClient` interface with `connect`, `subscribe`, `startCalibration`, `finishCalibration`, and `exportSession`. Dev supplies endpoint semantics; Kripa implements browser transport against them. Never make a disabled or mock action appear as a successful live action.
