# Contracts package (@steadyhand/contracts)

**Owner: Dev.** Canonical contract defined in [docs/contracts.md](../../docs/contracts.md).

Exports strict TypeScript domain models, runtime parser schemas (`parseAssistanceConfig`, `parseDeviceHello`, `parseSensorBatch`, `parseMotionFrame`, `parseHapticRequest`), UI adapter interfaces (`PopupAdapter`, `OptionsAdapter`, `DeviceClient`), and canonical JSON fixtures.

## Structure

- `src/settings.ts`: Pointer, filter, target, dwell, and assistance configuration interfaces.
- `src/device.ts`: Device hello, sensor capabilities, samples, batches, health, motion frames, calibration, and haptic models.
- `src/messages.ts`: Message envelopes, browser IPC commands, WebSocket frames, and session task events.
- `src/uiAdapter.ts`: Typed interfaces for popup, options, and dashboard adapters.
- `src/schemas.ts`: Strict zero-dependency runtime validators throwing `ContractError`.
- `examples/*.json`: Canonical valid and invalid test fixtures (`settings.json`, `device-hello.json`, `sensor-batch.json`, `motion-frame.json`, `invalid-frame.json`, `haptic-request.json`, `calibration-start.json`).

## Commands

Run TypeScript contract tests:
```bash
node --test packages/contracts/tests/contracts.test.ts
```

Run cross-language parity validation:
```bash
python scripts/check-contracts.py
```
