# Dashboard module

**Owner: Kripa.** Read the [team prompts](../../teams/02_kripa.md), [contracts](../../docs/contracts.md), and [UX](../../docs/ux.md).

Implement React/Vite setup, calibration, device inspection, and results. Import shared UI and contracts. Use a DeviceClient interface so mock and real transport share states. Keep source, quality, pairing, retries, empty results, and rejected calibration explicit.

No worker internals or Chrome API dependency. Pointer controls in a dashboard preview affect that preview only. User acceptance of actual webpage settings happens in the extension.

Deliverable: runnable dashboard, cleanup-safe subscriptions, actual API operations, readable fault states, and measured data presentation. Fill run/build commands here after implementation; no application code is included in this scaffold.
