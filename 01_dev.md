# Person 1: Dev, backend and hardware

## Ownership and outcome

Own services/bridge, firmware/unoq, packages/contracts, scripts, root workspace configuration, and hardware instructions. Your deliverable is a trustworthy service that works against mocks immediately and real motion data later. You own most backend and all firmware; Person 4 supplies analysis.

Hand off schemas early. Person 3 needs a streaming endpoint; Kripa needs device/calibration states; Person 4 needs timestamped batches. Do not wait for finished UI.

## Kickoff prompt

~~~text
Implement Dev's backend-and-hardware sector. Read AGENTS.md, plan.md, docs/architecture.md, docs/contracts.md, docs/hardware.md, and the READMEs in services/bridge, firmware/unoq, and packages/contracts. Only edit those owned paths, scripts, and root setup.

Inspect the real repository and installed environment first. Establish the TS contract package and Python service packaging without guessing SDK versions. Build mock-first FastAPI with interchangeable mock, replay, and uno_q adapters. Each yields canonical timestamped batches and explicit device metadata. Mocks never report source live.

Follow contracts exactly. Validate TS examples and Python models against identical fixtures. Implement health, authenticated device/calibration/session routes, WS handshake/snapshot/ping, and optional bounded haptics. Distinguish connected transport from fresh sensor health.

Use bounded buffers and client queues, explicit loss/error counters, and monotonic timing. Slow clients receive newest state rather than unbounded history. Preserve MCU timestamps; record receive time separately. Reset on boot/stream changes. Import steadyhand_signal from analysis instead of implementing another spectrum algorithm.

Keep pointer control off the server. Reject arbitrary page clicks, URL fetch proxies, entered values, or GPIO instructions. Pair locally with bearer HTTP and first-frame WS auth; validate configured origins and schemas independently. Never put or log tokens in URLs.

For UNO Q, identify the actual sensor and prove the installed MCU/Linux bridge first. Do not assume UNO R3 A4/A5 wiring, a particular chip, ordinary USB serial, or untested Python calls. Record supply, bus, address, driver, range, configured and fresh rate. Sampling uses coherent reads, a fixed ring, timeouts, boot ID, and wrapping-safe timestamps. Bridge callbacks enqueue and return.

Optional actuator code follows only verified parts. Motor off at boot, bounded pulse, deduplication, cooldown, and independent stop deadline. Publish pulse timing; block recommendations during uncertainty, pulse, settling, and until clean windows return. If no actuator exists, capability remains false.

Implement only my next named stage. Return exact files, schema/endpoint exports, actual checks, physical checks still required, and a fixture for consumers.
~~~

## Stage 1: setup and contracts

~~~text
Implement Stage 1 only. Create root workspace configuration and packages/contracts with schemas, types, UI adapter interfaces, and canonical valid/invalid examples. Establish Python packaging and /health. Add cross-language fixture validation. Coordinate package names @steadyhand/contracts, @steadyhand/engine, and @steadyhand/ui without generating other people's implementations. Acceptance: contracts build, valid examples pass, malformed examples fail, service health runs.
~~~

## Stage 2: mock service

~~~text
Implement mock/replay adapters, bounded queues, explicit source state, pairing, WS auth/snapshot/ping, and calibration endpoints. If analysis is absent, use an explicitly synthetic fake analysis adapter with the same interface. Never claim fake calibration is measured. Acceptance: multiple clients receive valid state; unauthorized WS fails; stale samples differ from connected transport; reconnect gets a fresh snapshot. Hand Person 3 the actual endpoint and Kripa calibration-state examples.
~~~

## Stage 3: live firmware and adapter

~~~text
Implement only after sensor identification. Use its actual driver and selected UNO Q bus. Acquire fresh coherent XYZ, timestamps, validity, and counters without blocking on transmission. Export metadata/batches through proven bridge calls. Document actual board-to-browser routing. Acceptance: stationary scale/orientation, measured fresh rate, unplug timeout, MCU boot reset, and one schema-valid live batch. If physical checks cannot run, mark live transport unverified.
~~~

## Stage 4: analysis integration

~~~text
Integrate Person 4's analysis library into the rolling-window loop. Honor null metrics, quality, calibration invalidation, and advisory recommendations. Implement idempotent calibration start and rejection states. Acceptance: known frequency, long gap, reboot, and stale cases match the analysis contract; dashboard and extension agree on source/quality. Do not replace their algorithm with an easier heuristic.
~~~

## Stage 5: optional motor and release

~~~text
If verified actuator hardware exists, integrate service and MCU validation, command deduplication, cooldown, stop deadline, pulse events, and blanking. Otherwise preserve capability false and package the service. Write actual launch instructions and build record. Acceptance: duplicate request gives one pulse; transport loss cannot leave it on; contaminated windows cannot recommend assistance; another teammate can start mock and supported live modes.
~~~

## Checkpoints

Hour 1: contracts/mock handshake. Hour 4: consumers unblocked and hardware smoke-test outcome. Hour 8: live adapter or explicit recorded fallback. Hour 12: calibration/source/faults. Freeze: runnable launch and wiring/version record.

Your first critical success is unblocking consumers. Pair with Person 4 on hardware analysis rather than taking over their numerical folder.
