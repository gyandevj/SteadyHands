# Project instructions for coding assistants

Read `README.md`, `plan.md`, `docs/contracts.md`, your team file, and the README in the module being changed before implementation. These documents define the intended build. Files in the proposed tree may not exist yet.

## Ownership

- Dev: `services/bridge/`, `firmware/unoq/`, `packages/contracts/`, `scripts/`, root build/dependency configuration.
- Kripa: `apps/dashboard/`, `packages/ui/`, `design/`, `apps/extension/src/popup/`, `apps/extension/src/options/`.
- Person 3: other `apps/extension/` paths and `tests/extension/`.
- Person 4: `packages/engine/`, `analysis/`, `apps/fixtures/`, `fixtures/`, `tests/engine/`, `tests/analysis/`, `evidence/`.

Inspect existing code before generating new files. Make the smallest coherent stage work. Do not overwrite another sector's files or regenerate root lockfiles without coordinating with Dev. An interface change requires the contract owner and affected consumers to agree; do not invent a private replacement schema.

## Nonnegotiable behavior

- Pointer filtering and dwell run locally in the content script. They cannot wait for backend responses.
- Use the mouse for coordinates. Do not double-integrate acceleration into cursor position.
- Software assistance works without sensor, backend, or network.
- One selection dispatches at most one action. Mode changes and invalid geometry cancel dwell.
- Preserve keyboard access, typing, scrolling, and native fallback.
- Never synthesize an entire event cascade to make one action look trusted. Programmatic events are not physical user gestures.
- P0 dwells focus text fields or toggle ordinary controls. Submit and unknown/high-consequence actions use normal user interaction.
- Keep source and quality labels honest. No fake successful device connection, pulse, benchmark, or diagnosis.
- Accelerometer and haptic actuator are separate. Never drive a bare motor directly from GPIO.
- Block motion recommendations during motor activity/settling and until a clean analysis window is rebuilt.
- No entered form values, page HTML, credentials, or browsing history in telemetry.
- The content script cannot choose arbitrary backend URLs or GPIO commands.
- No remote executable code, broad debugger permission, or cloud dependency in the core.

## Code and checks

Use TypeScript with strict types, runtime validation at boundaries, and pure numerical packages. Use Python type hints and bounded queues. Keep fake adapters explicit. Version dependencies based on the real installed environment; do not promise compatibility from a guessed SDK.

Check the risks introduced by the change. Important checks cover at-most-once behavior, cancellation, cleanup, source labels, timestamp gaps, invalid packets, worker restart, and haptic deduplication. Do not add repetitive tests that merely duplicate constants or implementation steps.

Return a concise handoff: implemented stage, files changed, commands/checks actually run, known limitations, and the next consumer-facing artifact. Mark unrun checks as unrun. Never report the whole project as complete because one screen renders.
