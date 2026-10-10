# Person 2: Kripa, frontend and UI/UX

## Ownership and outcome

Own apps/dashboard, packages/ui, design, extension src/popup, and extension src/options. Person 3 owns extension HTML entry points, build, transport, and mounting. You own product clarity, visual polish, and complete state handling.

Read [UX](../docs/ux.md) and [contracts](../docs/contracts.md). Work with mocks immediately.

## Kickoff prompt

~~~text
Implement Kripa's frontend/UI sector. Read AGENTS.md, plan.md, docs/ux.md, docs/contracts.md, and dashboard/UI module READMEs. Only edit apps/dashboard, packages/ui, design, and extension src/popup or src/options. Do not edit manifest, worker, content script, entrypoint HTML, root lockfile, or backend.

Create a calm utility interface with strong typography, generous controls, clear focus, restrained accent, and accessible semantics. Share tokens and small components through @steadyhand/ui. Favor understandable state over decorative chart density.

Build mountable popup/options React modules exporting mountPopup(container, adapter) and mountOptions(container, adapter), with cleanup. Use injected adapters, not imports of worker internals. Popup shows page support/enabled state, assistance preset, dwell, hardware/source, optional recommendation, disable, and settings/calibration links. A closing popup cannot own pointer timing or WS lifetime.

Options handles advanced settings, endpoint/token input, raw-pointer diagnostics, reset, and opt-in haptics when capability exists. Use runtime contract validation. Never echo tokens to overlays or logs.

Dashboard routes: setup, calibration, device inspection, results. Begin with DeviceClient fixtures, then actual HTTP/WS. Keep live, recorded, synthetic, unavailable, warming, stale, and rejected states distinct. Plot valid measurements with units. No fake spectrum, confidence percentage, device connection, or benchmark result.

Worker owns pointer settings. Dashboard preview settings are labeled Preview only. A calibration recommendation is accepted in the extension. Do not create a fake Apply-to-extension action or add external messaging outside scope.

Use semantic inputs/labels, keyboard access, visible focus, readable errors, reduced motion, and non-color-only status. No medical diagnosis language. Results are empty until real trials exist.

Implement only my next stage. Return files, component/mount exports, actual checks, unverified integrations, and handoff to Person 3/Dev.
~~~

## Stage 1: tokens and mocks

~~~text
Create tokens and Button, Toggle, Slider, SourceBadge, StatusBadge, EmptyState, AssistanceControls. Build popup/options and dashboard shells with canonical states. Include software assistance without hardware, rejected calibration, recorded/synthetic labels, and empty results. Export agreed UI mounts. Acceptance: keyboard controls work, status is not color-only, token stays private, and UI can run before transport.
~~~

## Stage 2: guided setup

~~~text
Implement skip, stationary capture, comfortable movement, progress, quality rejection/retry, and recommendation result. Device graphs show units/source/rate and unavailable values. Results distinguish completion and timeout with actual counts. Preview controls remain local and labeled. Acceptance: loading, failure, empty, and retry transitions work; recommendations do not silently change extension settings; no predetermined improvement number appears.
~~~

## Stage 3: real adapters

~~~text
Implement authenticated dashboard HTTP/WS client from the actual contract, retaining explicitly labeled mock mode. Connect popup/options to Person 3's adapter. Do not move transport into UI components. Refresh on configuration revision conflict. Acceptance: buttons call real interfaces; timeouts show readable errors; source/quality match service; reconnect cannot label old data live; unmount cleans subscriptions.
~~~

## Stage 4: polish

~~~text
Polish contrast, spacing, responsive layout, keyboard focus, reduced motion, and status copy. Supply tokens/icons to Person 3. Run the full guided flow with actual adapters and explicitly mark remaining mock paths. Do not build an unrelated landing page or new AI flow. Acceptance: an unfamiliar user can enable, identify source, skip calibration, accept in popup, disable, and understand actual results.
~~~

## Handoffs

Person 3 receives mount signatures, token imports, adapter types, and cleanup behavior. Report asset paths rather than rewriting the manifest. Dev receives exact endpoint mismatches; Person 4 receives metric/unit requests. Ask for source-aware fixtures instead of filling gaps with decorative data.
