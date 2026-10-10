# Acquisition adapters plan

## Purpose and boundaries

Adapters produce canonical, source-labeled device metadata and timestamped batches without implementing FFT, calibrations or browser actions. The launch mode is explicit and stable per adapter epoch.

## Current state

Directory empty. No MCU/Linux API or sensor has been verified. Dedeepya's synthetic fixtures exist and are usable now (`fixtures/synthetic/signals/*.json`: `{signal_id, seed, odr_hz, duration_s, components[], samples[]}` with `SensorSample` fields); the planned `fixtures/recorded/` provenance schema (`sensor_recording_v1`) and `fixtures/validate_recording.py` are not implemented and no real capture exists. Read [bridge README](../../../README.md), [master](../../../../../docs/implementation/dev.md), [analysis integration](../../../plans/analysis-integration.md), and [canonical contracts](../../../../../docs/contracts.md).

## Exact proposed files

Existing: none. Planned `base.py`: typed bounded producer interface `start`, `read_batch`, `health`, `stop` and metadata/error semantics; `mock.py`: deterministic synthetic clock, boot/stream IDs, honest `source=synthetic`, no fake successful hardware; `replay.py`: bounded, validated recorded fixtures with preserved original provenance and `source=recorded`; `uno_q.py`: installed-bridge-specific boundary with bounded drain, connectivity monitoring and actual metadata; all under `services/bridge/src/steadyhand_bridge/adapters/`. Person 4 owns recording fixture files, not this adapter.

## Interfaces and data flow

`device.hello` and `sensor.batch` fields, `g` and increasing MCU `t_us` follow [contracts](../../../../../docs/contracts.md#6-device-and-sample-frames); maximum 50 samples/batch, target ~10. Record host receive monotonic time separately, compare `seq`, `batch_seq`, `boot_id`, `stream_id`, errors and loss. Replay must preserve provenance while conveying that playback is not a current live connection; agree recording mapping with Person 4 rather than implementing their private schema.

Source labeling is derived from the input, never from the socket:

| Mode / input | Reported `source` | Rule |
| --- | --- | --- |
| `mock` (M2) | `synthetic` | deterministic generator, explicit synthetic label everywhere |
| `replay` of `fixtures/synthetic/signals/*.json` (M3) | `synthetic` | fixture metadata identifies generated data |
| `replay` of `sensor_recording_v1` provenance capture (M4/M6) | `recorded` | only with implemented provenance validation and a real capture |
| `uno_q` after verified round trip (M4/M5) | `live` | only with build-record evidence and fresh samples |
| any adapter failed/offline | `unavailable` | state, not a fourth data stream; never silently substitute another adapter |

## Implementation sequence

1. Define bounded typed interface and startup/close behavior against canonical fixtures.
2. Implement deterministic mock and fault injection for stale/duplicate/overflow/reboot.
3. Add replay after provenance and clock policy are agreed; do not rewrite Person 4's fixtures.
4. Implement UNO Q adapter only after the [bridge round-trip gate](../../../../../firmware/unoq/plans/mcu-linux-bridge.md).

## Failure and recovery behavior

Reject invalid/nonfinite packets and impossible timestamps; report loss and stale state rather than reusing repeated readings as fresh samples. A boot/stream change invalidates windows and calibration. Use bounded polling/drains, backoff on disconnect and cancellation on shutdown; keep `live` unavailable when hardware fails, never substitute mock silently.

## Acceptance checks

- No hardware: deterministic mock frames, strict recorded labeling, invalid/oversize batch rejection, stalled sequence and queue-cap tests.
- Board: scan, bridge drain, unplug, reboot and measured fresh rate; pending physical verification.
- Person 4: agreed recorded fixture metadata/analysis input; pending teammate artifact.

## Handoff

Pipeline imports one typed adapter interface; clients see a `device.hello` matching the canonical synthetic example or a real metadata frame only after hardware proof. Provide fixture path, startup mode and observed fault counters.

## Copy-ready implementation prompt

```text
Implement only base.py and mock.py. Read AGENTS.md, README.md, plan.md,
docs/contracts.md, root 01_dev.md, services/bridge/README.md, the parent
PLAN.md and this PLAN.md. Allowed paths services/bridge/** plus owned scripts
for actual checks. Produce typed bounded start/read_batch/health/stop adapter,
deterministic synthetic metadata and batches with increasing MCU microseconds,
sequence/counters, explicit source and optional stalled/reboot fault hooks.
Reject malformed/oversize data; stop polling on cancellation; never label mock
as live. Run formatter/linter, focused fake-adapter and protocol tests; hand
off import, fixture, fault reproduction and deferred replay/board decisions.
```
