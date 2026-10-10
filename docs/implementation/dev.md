# Dev master implementation plan

**Owner:** Dev (Person 1: `services/bridge/`, `firmware/unoq/`, `packages/contracts/`, `scripts/`, root build/dependency configuration). **Status:** planning updated 2026-10-10 after verifying Dedeepya's Stage 1-3 implementation; no Dev source code implemented; no physical check run. **Canonical interface:** [docs/contracts.md](../contracts.md), which wins over any plan in this repository. Read [project instructions](../../AGENTS.md), [blueprint](../../README.md), [project plan](../../plan.md), [my assignment](../../01_dev.md), and the module README/PLAN before implementing.

Pointer timing, DOM actions, and mouse coordinates stay in the content script. The service provides advisory, source-labeled sensor state only; the software-only extension works without it. Do not implement or edit another owner's paths; raise interface requests instead.

## 1. Current repository findings

### Branch and merge state (inspected, not modified)

| Ref | Commit | Contents | Relation to me |
| --- | --- | --- | --- |
| `origin/main` | `98c2518` | Merge PR #3 (Extension plan); contains PR #1 (Dedeepya Stages 1-3) and PR #2 (my planning branch) | Shared branch; already contains everyone's pushed work |
| `origin/planning/dedeepya` | `750ba1a` | Stage 1 engine, Stage 2 One Euro + traces, Stage 3 `steadyhand_signal` + IMU fixtures + tests | **Merged into main** (ancestor check exit 0) |
| `origin/Extension` | `c3cc5f6` | Person 3 plan `docs/implementation/extension.md` | Merged into main via PR #3 |
| local `planning/dev` (checked out) | `426804c` | My subsystem plans only | Behind main; does not contain Dedeepya's code in its tree |

Dedeepya's work is **implemented, tested, and merged to main**. It is not in my current checkout's tree, but it is fully inspectable through Git (`git show origin/planning/dedeepya:<path>`) and was verified by extracting `git archive origin/planning/dedeepya` to `%TEMP%\opencode\dedeepya-750ba1a` (no branch switch, no merge, no install).

Before M1 implementation: cut the implementation branch `dev/backend-hardware` (per [workflow](../workflow.md)) from `origin/main`, or merge `origin/main` into `planning/dev` after this planning PR. Do not start M1 from the stale `planning/dev` tree.

### Verified environment

- Node v24.12.0, npm 11.6.2, Python 3.13.7, pip 25.2, pytest 9.1.1, git 2.51.0.windows.1; **pnpm is not installed** (only corepack). Root workspace decision: **npm workspaces**, not pnpm. The shared `repository_tree.md`/`docs/repository_tree.md` still list `pnpm-workspace.yaml`; treat that as a stale scaffold and reconcile the shared tree with owner coordination during M1.
- Dedeepya verification actually run on this host, from the extracted archive:
  - `python -m pytest tests/analysis -q` with `PYTHONPATH=analysis/src` → **22 passed in 0.34s**.
  - `python -c "import steadyhand_signal"` → **import OK, 17 exports**.
  - `node --test "tests/engine/*.test.ts"` from repo root → **28 passed, 0 failed** (Node 24 type stripping; no install needed).
  - Running the package-local script `npm test` inside `packages/engine` discovers **0 tests** because its `tests/engine/*.test.ts` path is repo-root-relative. Root scripts must run from the repo root; report this to Dedeepya as an integration note, do not edit her package.

### What exists vs what is missing in my sector

- Existing: README/PLAN documents only. **Zero Dev source code** anywhere in `services/bridge/`, `firmware/unoq/steadyhand/`, `packages/contracts/`, `scripts/`.
- No UNO Q toolchain, installed MCU/Linux bridge, board scan, wiring photo, or measured sample rate exists in the repository. `firmware/unoq/build-record.md` is pending evidence, not proof.
- No recording exists: `fixtures/recorded/` has a README; `sensor_recording_v1` and `fixtures/validate_recording.py` are Person 4 plans only, not implemented. `fixtures/synthetic/signals/*.json` **do** exist and are usable.
- No actuator/motor inventory is established; haptics stay capability-`false` until verified.

## 2. Dedeepya integration findings (audited at `750ba1a`)

Implemented and verified by me: Python library imports and passes its suite; TS engine imports and passes its suite. Both are usable **today** without installation (`PYTHONPATH`/repo-root test invocation); package-manager installation is planned, not yet exercised.

### 2.1 Integration table

| Module / function | Actual input | Actual output | Units, time, state | Errors / reset | Ready to consume? | Exact Dev integration |
| --- | --- | --- | --- | --- | --- | --- |
| `steadyhand_signal.analyze_window(samples, calibration=None, capability=None, last_haptic_pulse_end_us=None)` | `list[SensorSample]` (immutable dataclasses), optional `CalibrationResult`, optional `SensorCapability`, optional int µs | `MotionResult(quality: WindowQuality, motion: MotionFeatures, recommendation: AdvisoryRecommendation\|None)` | `a_g` in `g`, `t_us` monotonic MCU µs, Hz. **Stateless** — no internal state or caching | No I/O; returns `invalid`/`unknown`/null for short/inverted/gapped/wrong-rate windows instead of raising; does **not** check non-finite values or seq inversion | Yes | Backend passes bounded window copies; maps result to `motion.frame`; owns time extension, finite/seq checks, quality translation, threading |
| `steadyhand_signal.calibrate_stationary(samples, capability)` | `list[SensorSample]`, `SensorCapability` | `CalibrationResult(state, reasons, bias_g, noise_std_g, sample_count, duration_ms)` | `g`, µs; rules: ≥64 samples, ≥800 ms, no invalid/saturated, mean gravity 0.85–1.15 g, noise σ ≤ 0.05 g | Stateless; `state="rejected"` + reasons, never raises | Yes | Backend owns calibration session state machine; calls once with the captured stationary window; maps result to `calibration.state` events |
| `steadyhand_signal.validate_window(samples, expected_odr_hz=100.0, max_gap_ms_threshold=40.0, range_g=2.0)` | same sample list | `WindowQuality(state, reasons, measured_hz, missing_fraction, max_gap_ms)`; states `good\|degraded\|invalid` | µs/ms/Hz; min 32 samples; `gap_exceeded`, `sensor_read_error`, `timestamp_inversion`, `insufficient_samples` | Reason strings are stable enough to forward; no exceptions | Yes | Optional to call directly; `analyze_window` already invokes it. Backend forwards `reasons` into canonical quality |
| `is_haptic_blanking_active(samples, last_haptic_pulse_end_us=None, settling_cooldown_us=500_000)` | same + last pulse end | `(bool, list[str])` reasons `actuator_pulse_overlap`/`post_haptic_settling_window` | µs | Stateless | Yes, but only relevant once an actuator exists | Used indirectly by `analyze_window`; backend tracks last pulse end from `haptic.pulse` and passes it |
| `resample_to_grid`, `compute_axis_psd`, `compute_summed_psd`, `extract_features`, `classify_motion`, `generate_recommendation` | arrays / feature dataclasses | arrays / features / status / recommendation | pure stdlib + no deps | n/a | Internal | Do not call from the backend except in boundary tests; never reimplement |
| `packages/engine` `createInteractionEngine(config)`, `InteractionEngineImpl.step/cancel/reset/applyConfig/getConfig`, `ExponentialFilter`, `OneEuroFilter`, `TargetArbitrator`, `DwellStateMachine`, `PRESETS`, `resolveConfig` | `EngineInput{raw: Point, targets, geometryRevision, configRevision}`; `AssistanceConfig` | `EngineOutput{pointer, candidateId, ambiguous, dwellProgress, selection}` | CSS px, `performance.now()` ms; stateful filter/dwell; cancel on config/geometry revision; at-most-once selection | Guards non-finite input, duplicate dt, long-pause reset | Yes, for Person 3 | Dev's obligation: keep `AssistanceConfig`/`EngineInput`/`EngineOutput` in `@steadyhand/contracts` **structurally identical** to `packages/engine/src/types.ts`. Do not depend on engine from Python |
| `fixtures/synthetic/signals/*.json` (7 conditions: quiet, 5 Hz, 8 Hz, multi-tone, saturation, 45 ms gap, haptic pulse) | top level `{signal_id, seed, odr_hz, duration_s, components[], samples[{seq,t_us,a_g,valid,saturated,haptic_active}]}` | same shape | 100 Hz, `g`, `t_us` from 0 | n/a | Yes, for replay + analysis checks | Dev replay adapter reads these **as synthetic** (`source=synthetic`); do not rewrite Person 4's files |
| `fixtures/recorded/` + `sensor_recording_v1` + `fixtures/validate_recording.py` | planned provenance+samples schema | planned | planned | not implemented | **No** — blocked on hardware capture | Replay of real recordings is M4/M6 work; do not invent the schema; use Person 4's plan and only after a real capture exists |
| `tests/analysis/*` (22), `tests/engine/*` (28) | fixtures | pass on this host | — | — | Yes | Root scripts rerun both; add backend boundary tests that reuse the same fixtures |

### 2.2 Analysis internals that decide backend behavior

- Window validation thresholds: min 32 samples; `max_gap_ms > 40` is fatal (`invalid`); sequence-drop `missing_fraction > 0.15` flags `high_packet_loss`; saturation when any axis ≥ `0.99 * range_g`; measured-rate error > 20 % flags `sample_rate_jitter`; inversion/read errors are fatal.
- Spectral pipeline: resample to `capability.odr_hz` (default 100.0), mean detrend, Hann, one-sided PSD summed across X/Y/Z, 3–12 Hz features; `dominant_hz` is `None` at low energy.
- Classification: quiet below `max(0.015 g, 3 * calibration.noise_std_g)`; periodic when band ratio ≥ 0.40, concentration ≥ 0.35, dominant in 3–12 Hz; otherwise `broadband_motion`; recommendation only for periodic (`steady` 3–6.5 Hz, `light` 6.5–12 Hz), always `requires_user_acceptance=true`.
- Blanking: any `haptic_active` sample OR window start within 500 ms after `last_haptic_pulse_end_us` ⇒ quality `haptic_blanking`, motion `unknown`, null recommendation.
- Zero third-party dependencies; package `steadyhand-signal` v0.1.0, `requires-python >= 3.10`, setuptools build; install planned as `pip install -e ./analysis`.

### 2.3 Contract mismatches and smallest compatible resolutions

Recorded so M1 can reconcile; **do not change Person 4's files** and do not silently diverge from `docs/contracts.md`. `docs/contracts.md` is Dev-owned, so agreed wording updates happen there during M1 with Dedeepya's sign-off (M1 output is the agreement).

| # | `docs/contracts.md` | Actual implementation | Smallest compatible resolution |
| --- | --- | --- | --- |
| 1 | `analyze_window(samples, calibration, config)` | `analyze_window(samples, calibration=None, capability=None, last_haptic_pulse_end_us=None)` | Treat `capability` as the "config" boundary; backend calls with keyword args. Update contracts §5 wording at M1; no code change to analysis |
| 2 | `calibrate_stationary(samples, sensor_metadata)` | `calibrate_stationary(samples, capability: SensorCapability)` | Rename the documented parameter to `capability` and reference the shared type at M1 |
| 3 | Quality states `warming_up\|good\|degraded\|stale\|haptic_blanking\|unavailable` | Analysis emits `good\|degraded\|invalid\|haptic_blanking` | Backend translates at the frame boundary: `invalid` → `degraded` (reasons preserved) while transport is fresh; `warming_up` before the first full window; `stale` when no new sample ≥ 500 ms (host monotonic clock); `unavailable` when the adapter is down. Add `invalid` to the canonical enum only if Kripa needs a distinct UI state |
| 4 | Motion `other_motion` | `broadband_motion` | Map `broadband_motion` → `other_motion` in the frame serializer; leave analysis untouched |
| 5 | `device.hello.sensor` has `model,bus,address_hex,odr_hz,range_g,units`; haptics under `capabilities` | `SensorCapability` also has `resolution_bits`, `haptics` | Add optional `resolution_bits` to canonical `device.hello.sensor` (additive, no `v` bump); project `capabilities.haptics` from the same struct. Mock may use `model="generic"`, `address_hex="0x00"` only when labeled synthetic |
| 6 | Samples finite, timestamps monotonic and wrap-safe | `validate_window` does not check non-finite `a_g`, duplicate/negative `seq` | Backend boundary rejects non-finite values and non-increasing `seq` before buffering; single time-extension point stays the producer (MCU emits extended monotonic `t_us`; replay normalizes documented raw 32-bit wrap once, at the replay adapter) |
| 7 | `haptic.request` flow | `last_haptic_pulse_end_us` is the blanking input | Backend records pulse end from `haptic.pulse`/MCU counters and passes it to every `analyze_window` call for that stream |
| 8 | — | `packages/engine` package-local test path resolves to 0 tests | Root script runs engine tests from repo root; note to Dedeepya (no edit) |
| 9 | Contracts types are canonical | Engine duplicates the same shapes standalone | Structural typing: contracts owns runtime schemas; engine stays dependency-free; extension imports both. No forced cross-dependency unless Dedeepya later agrees to re-export |

## 3. Complete proposed Dev-owned source tree

Planned files (not implemented). "Conditional" means only after the stated physical/API gate closes.

```text
root: package.json (npm workspaces: apps/*, packages/*), package-lock.json (only after real install),
      tsconfig.base.json, .gitignore, .env.example
docs/implementation/dev.md
packages/contracts/{README.md,PLAN.md,package.json,tsconfig.json}
packages/contracts/src/{PLAN.md,index.ts,schemas.ts,settings.ts,device.ts,messages.ts,uiAdapter.ts}
packages/contracts/examples/{PLAN.md,settings.json,device-hello.json,sensor-batch.json,motion-frame.json,invalid-frame.json}
services/bridge/{README.md,PLAN.md,pyproject.toml}
services/bridge/plans/{configuration-and-lifecycle,authentication,websocket-lifecycle,calibration-orchestration,analysis-integration,actuator-supervision}.md
services/bridge/src/steadyhand_bridge/{PLAN.md,__init__.py,__main__.py,main.py,config.py,models.py,contracts.py,auth.py,version.py}
services/bridge/src/steadyhand_bridge/adapters/{PLAN.md,base.py,mock.py,replay.py,uno_q.py (conditional)}
services/bridge/src/steadyhand_bridge/pipeline/{PLAN.md,acquisition.py,buffers.py,analysis_runner.py,calibration.py,haptic_supervisor.py (conditional)}
services/bridge/src/steadyhand_bridge/api/{PLAN.md,health.py,device.py,calibration.py,haptics.py (conditional),sessions.py,stream.py}
services/bridge/src/steadyhand_bridge/sessions/{PLAN.md,store.py,export.py}
services/bridge/tests/{PLAN.md,test_protocol.py,test_stream_reconnect.py,test_analysis_integration.py,test_haptic_dedup.py (conditional)}
firmware/unoq/{README.md,build-record.md,PLAN.md}
firmware/unoq/plans/{hardware-identification,sensor-acquisition,sample-buffering,mcu-linux-bridge,haptic-control,bringup-and-verification}.md
firmware/unoq/steadyhand/{PLAN.md,steadyhand.ino,sensor_driver.h,sensor_driver.cpp,sample_queue.h,sample_queue.cpp,bridge_rpc.h,bridge_rpc.cpp,haptic_control.h,haptic_control.cpp (conditional)}
firmware/unoq/linux/{PLAN.md,bridge_reader.py (conditional: only if the verified bridge needs a Linux-side shim)}
scripts/{PLAN.md,setup.ps1,run-mock.ps1,run-replay.ps1,run-hardware.ps1,check-contracts.py,check-analysis-integration.py,demo-smoke.ps1}
scripts/plans/{workspace-and-environment,launch-and-connectivity,demo-packaging}.md
```

Windows PowerShell scripts are primary because the demo laptop is Windows; `.sh` equivalents are optional and untested. Do not add a shell dependency just to run the demo.

## 4. Dependency order

1. **M1 contracts** unblock Person 3/Kripa/Person 4: canonical schemas, root workspace, cross-language fixtures.
2. **M2 mock service** unblocks Person 3 Stage 4 and Kripa: `/health`, `/v1/device`, WS auth/snapshot/ping, synthetic batches, honest `warming_up` frames.
3. **M3 analysis integration** (needs only M2 + Dedeepya's merged library): rolling window → `analyze_window`, replay from synthetic signals, calibration endpoints.
4. **M4 hardware bring-up** (physical track can start in parallel with M1, but gates on hardware identification): scanner → driver → ring → bridge → adapter.
5. **M5 live integration** (needs M4 + M2/M3): live adapter through the same pipeline into the existing dashboard/extension interface.
6. **M6 recovery + demo** (needs M5 or an explicit recorded fallback): disconnect/reconnect, labels, launch scripts, sessions/export if evidence needs it, optional haptics last.

## 5. Milestones

Every milestone lists exact files, dependencies, public interfaces, mock surface, delivered behavior, verification, and what stays out.

### M1 — Contract reconciliation

- **Files:** root `package.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`; `packages/contracts/package.json`, `tsconfig.json`, `src/{index,schemas,settings,device,messages,uiAdapter}.ts`; `packages/contracts/examples/*.json` (+ targeted invalid cases); `services/bridge/src/steadyhand_bridge/{contracts,models}.py`; `services/bridge/pyproject.toml`; `scripts/check-contracts.py`, `scripts/setup.ps1`; tests in `services/bridge/tests/test_protocol.py` and a contracts TS test.
- **Dependencies:** Node 24 + npm 11 (installed); TypeScript as the only root devDependency (verified install in M1); `pydantic` v2 for Python wire models (installed with the service in M2 — M1 can run the Python side once `pip install pydantic` is verified; mark if unrun). No other packages.
- **Public interfaces:** `@steadyhand/contracts` exports `AssistanceConfig`, `Point`, `Rect`, `Target`, `EngineInput`, `EngineOutput`, `SelectionEvent`, `DeviceHello`, `SensorBatch`, `MotionFrame`, plus `parse*` validators and `ContractError`; `uiAdapter.ts` declares `PopupAdapter`/`OptionsAdapter` (`getState`, `enablePage`, `disablePage`, `updateSettings(patch)`, `subscribe`) and `DeviceClient` (`connect`, `subscribe`, `startCalibration`, `finishCalibration`, `exportSession`) per [contracts](../contracts.md#11-ui-adapters) and Person 3's plan.
- **Mockable:** everything; examples are synthetic and labeled `source=synthetic`.
- **Delivers:** one canonical schema set both languages validate against identical fixtures; `revision`-safe settings validation; M1 mismatch resolutions 1–6 accepted by Dedeepya before code freezes.
- **Verify:** `node --experimental-strip-types packages/contracts/tests/contracts.test.ts`; `python scripts/check-contracts.py` (runs both validators over `examples/`); malformed cases fail in both; `tsc --noEmit` strict.
- **Out:** any HTTP/WS, adapters, analysis calls, firmware, UI.

**Copy-ready prompt M1:** combine the stage prompt already in [packages/contracts/PLAN.md](../../packages/contracts/PLAN.md) with the mismatch resolutions in §2.3; read `docs/contracts.md`, this file, `packages/contracts/{README,PLAN,src/PLAN,examples/PLAN}.md`, `services/bridge/README.md`, `scripts/PLAN.md`; allowed `packages/contracts/**`, `services/bridge/{pyproject.toml,src/steadyhand_bridge/{contracts,models}.py,tests/test_protocol.py}`, `scripts/**`, root config. Implement the mismatch resolutions as an explicit handoff table for Dedeepya. Run the three checks above; report exact results and unrun items; do not implement M2.

### M2 — Working mock backend

- **Files:** `services/bridge/src/steadyhand_bridge/{__init__,__main__,main,config,auth,version}.py`; `adapters/{base,mock}.py`; `pipeline/{acquisition,buffers}.py`; `api/{health,device,stream}.py`; `tests/test_stream_reconnect.py` extensions; `scripts/run-mock.ps1`.
- **Dependencies:** M1; `fastapi`, `uvicorn`, `pydantic`, `pytest`, `httpx`, `ruff` pinned after a verified install; no analysis import yet.
- **Public interfaces:** `GET /health` (version + uptime only); bearer `GET /v1/device`; `WS /v1/stream` with unauthenticated start, `client.auth` within 3 s, `state.snapshot`, `client.ping`/`server.pong`, `device.hello`, `device.health`, `motion.frame` with `quality.state="warming_up"` and null motion/`recommendation=null` until M3; 64 KiB frame cap; origin allowlist; 20 s application heartbeat; slow-client newest-state policy.
- **Mockable:** the entire service is mock-first by design (`--mode mock`); deterministic clock and fault hooks (stall, duplicate, reboot, malformed).
- **Delivers:** Person 3's Stage 4 transport and Kripa's dashboard can connect and render honest connected/stale/unavailable states before hardware exists.
- **Verify:** pytest auth-late/oversize/wrong-origin/snapshot-on-reconnect/stale-vs-connected/slow-client; a WS client script receives schema-valid frames; `curl /health`.
- **Out:** numeric motion frames, calibration, replay, UNO Q, sessions, haptics.

**Copy-ready prompt M2:** extend the existing [bridge PLAN.md](../../services/bridge/PLAN.md) prompt; read contracts, auth, websocket-lifecycle, configuration-and-lifecycle plans, Person 3's `docs/implementation/extension.md` Stage 4; allowed `services/bridge/**`, `scripts/**`, root config. Deliver `create_app(config)` with injectable clock/adapter, mock adapter emitting `device.hello` + ≤50-sample synthetic batches, and the WS lifecycle above. Never label mock as live; malformed frames are rejected without crashing. Run ruff, pytest, package build; hand off endpoint, token flow, and unrun board checks.

### M3 — Dedeepya analysis integration

- **Files:** `pipeline/analysis_runner.py`, `pipeline/calibration.py`, `adapters/replay.py`, `api/calibration.py`, `api/stream.py` additions, `models.py` frame serializer, `tests/test_analysis_integration.py`, `scripts/check-analysis-integration.py`, `scripts/run-replay.ps1`; update [analysis-integration plan](../../services/bridge/plans/analysis-integration.md).
- **Dependencies:** M2; `pip install -e ./analysis` (verified importable without install; installation step unverified until run); no new PyPI deps.
- **Public interfaces:** `analyze_window(samples, calibration=None, capability=None, last_haptic_pulse_end_us=None)` consumed exactly as implemented; `calibrate_stationary(samples, capability)` behind `POST /v1/calibration/start`, `GET /v1/calibration/{id}`, `POST /v1/calibration/{id}/finish` with idempotent request IDs; `motion.frame` now carries real quality/motion/recommendation with the §2.3 translations.
- **Mockable:** replay adapter streams `fixtures/synthetic/signals/*.json` as `source=synthetic`; calibration exercised on quiet fixtures; analysis can be fault-injected (exception → `analysis_unavailable`, never fake numbers).
- **Delivers:** mock/replay samples processed by her actual algorithm with correct quality, null states, and errors; known-fixture checks; rolling window cadence.
- **Verify:** `scripts/check-analysis-integration.py` asserts 5 Hz/8 Hz dominance within one FFT bin, `quiet` + null recommendation, gapped/saturated → non-recommending quality; cadence ≈250 ms via injected clock; calibration accepts the quiet fixture and rejects the saturated one; frames validate against `motion-frame.json`.
- **Out:** hardware, live source, sessions/export, haptics, UI work.

**Copy-ready prompt M3:** use the prompt in [analysis-integration.md](../../services/bridge/plans/analysis-integration.md) (updated for the verified signature); read contracts §5–§7, `analysis/README.md`, her `models.py`, this file §2. Keep windows bounded (2 s target, ≤250 ms cadence, ≥32 samples before analysis), call in a worker thread/executor so WS handling never blocks, translate quality/status exactly as §2.3, and never reimplement DSP. Run unit + fixture checks; report frames observed and unrun board cases.

### M4 — Hardware bring-up

- **Files:** `firmware/unoq/steadyhand/{steadyhand.ino,sensor_driver.h,sensor_driver.cpp,sample_queue.h,sample_queue.cpp,bridge_rpc.h,bridge_rpc.cpp}`; conditional `firmware/unoq/linux/bridge_reader.py`; `services/bridge/adapters/uno_q.py`; `firmware/unoq/build-record.md` entries; `scripts/run-hardware.ps1`.
- **Dependencies:** M2/M3 service side; physical sensor identification and the installed UNO Q toolchain/bridge (all unverified). Toolchain and bridge API must be proven by a minimal round trip before driver selection and before `uno_q.py` is written.
- **Public interfaces:** logical MCU methods `device_info`, `drain_samples`, `device_health`, optional `queue_haptic` (names, not SDK calls) as in [hardware](../hardware.md#4-firmware-responsibilities); `uno_q` adapter yields canonical `device.hello`/`sensor.batch` (`source=live` only after proof).
- **Mockable:** everything above the bridge: the adapter contract is testable against a fake transport; scanner/driver code is not mockable.
- **Delivers:** verified chip/bus/address/range/ODR, timestamped coherent XYZ with sequence/boot ID/overflow counters, measured sample interval, and one schema-valid batch reaching the service over a documented, verified route.
- **Verify (all unrun until hardware):** bring-up sequence 1–10 in [hardware-identification](../../firmware/unoq/plans/hardware-identification.md) and [bringup-and-verification](../../firmware/unoq/plans/bringup-and-verification.md); build-record entries; unplug/reboot recovery.
- **Out:** haptics, dashboard polish, long-run soak.

**Copy-ready prompt M4:** use the prompt in [firmware/unoq/PLAN.md](../../firmware/unoq/PLAN.md) for identification first; do not write model-specific acquisition until identity is photographed and the chip datasheet matched. Do not assume UNO R3 A4/A5 wiring, ordinary USB serial, or unverified Python bridge calls.

### M5 — Live integration

- **Files:** `adapters/uno_q.py` finalization, `pipeline/acquisition.py` stale/restart handling, `api/stream.py` source propagation, `tests/test_stream_reconnect.py` hardware-simulation cases; no frontend edits.
- **Dependencies:** M2–M4; Person 3's worker and Kripa's dashboard as consumers (their transports already tested against mock frames).
- **Public interfaces:** unchanged canonical frames; only `source` becomes `live` and `device.health` reports fresh/stale from measured data.
- **Mockable:** a recorded replay fallback must remain one flag away; the demo must never show synthetic data under a live badge.
- **Delivers:** hardware samples → backend → analysis → existing dashboard/extension interface; unplug/replug and MCU reboot visible as stale/unavailable → fresh again.
- **Verify:** one live schema-valid `motion.frame` with `source=live`; disconnect cancels recommendations; reboot clears calibration/windows; Person 3 confirms extension pointer assistance continues when the service dies.
- **Out:** sessions/export, haptics, evidence polish.

### M6 — Recovery and demonstration

- **Files:** `scripts/{setup,run-mock,run-replay,run-hardware,demo-smoke}.ps1`, `scripts/check-*`; `sessions/{store,export}.py`, `api/sessions.py` + tests if evidence needs session export; `firmware/unoq/build-record.md` final entries; root README launch section; optional `pipeline/haptic_supervisor.py`, `api/haptics.py`, `firmware/unoq/steadyhand/haptic_control.*` **only if actuator hardware exists**.
- **Dependencies:** M1–M5 or the labeled recorded fallback; any new dependency justified and pinned.
- **Public interfaces:** session routes per contracts §8 if implemented; haptic routes per contracts §10 only when `capabilities.haptics=true`; launch flags `--mode mock|replay|uno_q`.
- **Mockable:** all recovery paths exercised with mock/replay before the live rehearsal.
- **Delivers:** reproducible launch commands for every mode, honest data-source labels, a verified fallback (live+board → live+recorded → software-only+video), and a teammate can start it from the docs.
- **Verify:** `scripts/demo-smoke.ps1` starts mock, receives one valid frame, exits nonzero on failure; two full demo runs after restart; `docs/testing.md` fresh-restart check; build-record complete for every claim shown.
- **Out:** anything not built stays unclaimed: no motor pulse, no calibration accuracy, no medical framing.

## 6. Global acceptance criteria

- Contracts validate identically in TS and Python over shared fixtures; malformed counterparts fail for the same reason class.
- Mock mode runs with no hardware and never reports `live`; replay is `synthetic`/`recorded` as the file demands; `live` appears only after M4/M5 evidence.
- Fresh sample health is independent of socket health; stale starts at 500 ms without a new sample on the host monotonic clock.
- One selection dispatches at most one action; backend messages can never become browser click commands.
- No entered values, page HTML, complete URLs, credentials, or tokens in telemetry, URLs, or logs.
- Disconnect, MCU reboot, and worker restart cannot replay actions or leave an actuator on.
- Known analysis fixtures: 5/8 Hz within one FFT bin; invalid/gapped/saturated windows never recommend; haptic windows blanked.
- Every claim shown in the demo has a completed `build-record.md` entry; unrun checks stay marked unrun.

## 7. Handoffs

| Consumer | First artifact (when) | Later dependency |
| --- | --- | --- |
| Person 3 | M1 `@steadyhand/contracts` exports + examples; M2 mock WS at `ws://127.0.0.1:8765/v1/stream` (candidate, confirmed at launch) with first-frame auth/snapshot/ping | Live adapter M5; no command replay; derived-only default |
| Kripa | M1 source/quality/null examples; M2 connection states + M3 calibration-state fixtures (`warming_up`, complete/rejected reasons, `haptic_blanking`) | Actual dashboard transport against the same endpoints; `DeviceClient` semantics |
| Dedeepya | M1 mismatch-resolution table (signatures, quality/status mapping, optional `resolution_bits`, seq/finite checks live in the backend); M3 real fixture results | Real captures for calibration/mount validation after M4; replay recordings after M4 |
| Dev | M3 analysis frames and M4 hardware facts | Recording provenance mapping before replay of real captures |

## 8. Hardware uncertainties (blocking facts)

- Exact Grove accelerometer chip, board revision, and marking — blocked; identification procedure in [hardware-identification](../../firmware/unoq/plans/hardware-identification.md). Candidate addresses/limitations (LIS3DHTR, ADXL345, MMA7660FC) are examples from [hardware](../hardware.md), not identity.
- UNO Q MCU↔Linux bridge API and host route — unverified. Candidate reference: Arduino UNO Q official docs and the `Arduino_RouterBridge` candidate in [sources](../sources.md). Do not assume classic USB serial, UNO R3 wiring, or any SDK symbol before a measured round trip.
- Sensor mount, cable strain relief, actual ODR (100/120 Hz expectation only), resolution, and noise floor — unmeasured.
- Actuator and driver — inventory unestablished; haptics capability stays `false` and M6 actuator work is skipped unless parts are verified. The accelerometer cannot provide haptics; never drive a bare motor from GPIO.
- Board-to-laptop connectivity (SSH forward vs LAN endpoint) — test on the actual demo laptop; loopback remains the only committed endpoint shape.

## 9. Demo fallback

1. Live extension + live board (M5 verified).
2. Live extension + **clearly labeled** recorded/synthetic trace through the same backend pipeline (`source=synthetic` or `recorded`).
3. Software-only extension + labeled hardware video.

Never keep a live badge during replay; a network outage must not erase the core extension demo. The mock/replay modes from M2/M3 are the fallback and must be rehearsed as such, not presented as live hardware.

## 10. Subsystem plans

| Area | Plans |
| --- | --- |
| Service | [bridge](../../services/bridge/PLAN.md), [package](../../services/bridge/src/steadyhand_bridge/PLAN.md), [adapters](../../services/bridge/src/steadyhand_bridge/adapters/PLAN.md), [API](../../services/bridge/src/steadyhand_bridge/api/PLAN.md), [pipeline](../../services/bridge/src/steadyhand_bridge/pipeline/PLAN.md), [sessions](../../services/bridge/src/steadyhand_bridge/sessions/PLAN.md), [tests](../../services/bridge/tests/PLAN.md) |
| Service features | [configuration/lifecycle](../../services/bridge/plans/configuration-and-lifecycle.md), [auth](../../services/bridge/plans/authentication.md), [WS lifecycle](../../services/bridge/plans/websocket-lifecycle.md), [calibration](../../services/bridge/plans/calibration-orchestration.md), [analysis integration](../../services/bridge/plans/analysis-integration.md), [actuator](../../services/bridge/plans/actuator-supervision.md) |
| Firmware | [UNO Q](../../firmware/unoq/PLAN.md), [sketch](../../firmware/unoq/steadyhand/PLAN.md), [identification](../../firmware/unoq/plans/hardware-identification.md), [acquisition](../../firmware/unoq/plans/sensor-acquisition.md), [buffering](../../firmware/unoq/plans/sample-buffering.md), [MCU/Linux bridge](../../firmware/unoq/plans/mcu-linux-bridge.md), [haptics](../../firmware/unoq/plans/haptic-control.md), [bring-up](../../firmware/unoq/plans/bringup-and-verification.md) |
| Contracts | [package](../../packages/contracts/PLAN.md), [schemas](../../packages/contracts/src/PLAN.md), [examples](../../packages/contracts/examples/PLAN.md) |
| Setup | [scripts](../../scripts/PLAN.md), [workspace](../../scripts/plans/workspace-and-environment.md), [launch](../../scripts/plans/launch-and-connectivity.md), [demo packaging](../../scripts/plans/demo-packaging.md) |

## 11. Open decisions and integration requests

- M1 requires Dedeepya's sign-off on §2.3 before `docs/contracts.md` §5 wording changes; quality/status translation is the backend's job either way.
- Person 3 proposes formalizing `PopupAdapter`/`OptionsAdapter` in `uiAdapter.ts` and confirms `mode` includes `raw_virtual` and `Target` includes `id/rect/kind/enabled/dwellAllowed` — already true in contracts; M1 exports them.
- WS payload details still open: `state.snapshot` shape, `device.health` body, subscription opt-in, auth-error replies, heartbeat deadline. M2 freezes a first version with examples; consumers can request additive changes only.
- Calibration `intentional` phase stays unimplemented until its semantics are defined; M3 implements `stationary` only and rejects the rest with a reason.
- Session event/export shapes and retention remain open; M6 implements them only if evidence needs them.
- `01_dev.md` vs `teams/01_dev.md` link conflict: root file is authoritative; update the two links with owner coordination, do not edit other owners' files now.
- Shared `repository_tree.md`/`docs/repository_tree.md` still list pnpm; M1 updates root config to npm workspaces and notes the divergence instead of silently rewriting shared docs.

## 12. Exact first implementation prompt

```text
Implement Dev Milestone 1 (contract reconciliation) only, as working code, not
more planning. Read AGENTS.md, README.md, plan.md, docs/contracts.md,
docs/implementation/dev.md (especially the Dedeepya integration table and
mismatch resolutions), packages/contracts/{README.md,PLAN.md,src/PLAN.md,
examples/PLAN.md}, services/bridge/README.md, and scripts/PLAN.md.

Allowed paths: packages/contracts/**, services/bridge/pyproject.toml plus
services/bridge/src/steadyhand_bridge/{contracts.py,models.py} and
services/bridge/tests/test_protocol.py, scripts/**, and Dev-owned root build
config. Do not edit packages/engine, analysis, apps, or other owners' plans.

Deliver: npm-workspace root config; @steadyhand/contracts strict TS types and
runtime validators for AssistanceConfig, device.hello, sensor.batch, and
motion.frame plus uiAdapter declarations; matching Python models; shared
valid/invalid JSON examples; scripts/check-contracts.py; a contracts test
script. Apply the smallest compatible mismatch resolutions recorded in the
master plan (capability keyword boundary, quality/status translation owned by
the backend, optional resolution_bits, backend-side finite/sequence checks)
and write them into the handoff for Dedeepya.

Use the installed Node 24/npm 11/Python 3.13; add only TypeScript (root
devDependency) and pydantic as justified; mark any check you could not run.
Verify: strict tsc --noEmit, TS test runner via node type stripping, Python
validator parity over every example, malformed cases failing in both. Hand off
exact exports, fixture paths, commands, results, unresolved settings bounds,
and say explicitly that M2 service work has not started.
```
