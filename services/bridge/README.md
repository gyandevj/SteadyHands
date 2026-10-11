# Local bridge service (steadyhand_bridge)

**Owner: Dev.** Conforms strictly to [architecture](../../docs/architecture.md) and [contracts](../../docs/contracts.md).

FastAPI bridge service providing device adapters (`mock`, `replay`, `uno_q`), bounded buffering, real analysis runner integration with Dedeepya's `steadyhand_signal`, pairing authentication, session tracking, and WebSocket streaming.

## Features

- **Adapters**:
  - `mock`: Deterministic synthetic 100 Hz accelerometer batches with configurable tremor and fault hooks. Zero hardware required.
  - `replay`: Replays synthetic or recorded fixtures (`fixtures/synthetic/signals/*.json`).
  - `uno_q`: Host/Linux bridge adapter communicating with Arduino UNO Q firmware.
- **Analysis Integration**: Automatically imports and calls Dedeepya's `steadyhand_signal.analyze_window` and `calibrate_stationary`. Bounded 200-sample windows at 250 ms cadence. If unavailable, reports explicit `unavailable` quality; never fabricates numbers.
- **Security & Privacy**: Pairing token required for `/v1/*` routes and WebSocket stream. Tokens kept out of URLs and logs. Strict origin validation. No personal form values, page HTML, or URLs recorded in telemetry.
- **WebSocket Protocol**: `/v1/stream` supports 3-second authentication handshake (`client.auth`), immediate `state.snapshot`, periodic `motion.frame` broadcasts, ping/pong heartbeats, and slow-client drop-oldest policy.

## Setup

Install dependencies:
```bash
pip install -e services/bridge
# Or:
pip install fastapi uvicorn pydantic httpx websockets numpy pytest
```

## Running the Service

### Mock Mode (immediate local testing, no hardware needed)
```bash
# PowerShell
.\scripts\run-mock.ps1

# Direct Python
python -m steadyhand_bridge --mode mock --port 8765
```

### Replay Mode
```bash
# PowerShell
.\scripts\run-replay.ps1 -Fixture "packages/contracts/examples/sensor-batch.json"

# Direct Python
python -m steadyhand_bridge --mode replay --fixture "packages/contracts/examples/sensor-batch.json" --port 8765
```

### Hardware Mode (with Arduino UNO Q attached)
```bash
# PowerShell
.\scripts\run-hardware.ps1 -DevicePort "COM3"

# Direct Python
python -m steadyhand_bridge --mode uno_q --device-port COM3 --port 8765
```

## Testing

Run unit & integration tests:
```bash
python -m pytest services/bridge/tests -v
```

## Adaptive Forms with Gemini (V2 Additive Feature)

The bridge provides an authenticated endpoint at `POST /v1/adaptive-forms/plan` for AI-assisted layout restructuring.
- **Privacy Guaranteed**: Only document-local field aliases (`field-1`, `field-2`) and labels are processed. No entered values or PII are accepted or forwarded.
- **Upstream Gemini API**: Uses `google-genai` SDK (`gemini-3.8-flash`) with structured outputs.
- **Offline / Mock Fallback**: When `GEMINI_API_KEY` is not set, the bridge automatically uses a deterministic heuristic grouping algorithm, keeping testing functional offline.

Run end-to-end smoke check:
```bash
.\scripts\demo-smoke.ps1
```
