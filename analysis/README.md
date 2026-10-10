# Pure motion-analysis library

**Owner: Person 4.** Read [hardware analysis requirements](../docs/hardware.md), [contracts](../docs/contracts.md), and [team prompts](../teams/04_algorithms.md).

Provide installable steadyhand_signal with typed sample/result models, quality, resampling, stationary calibration, axis PSD, features, and conservative state persistence. No FastAPI, device I/O, or Chrome dependency.

Numerical assumptions: actual timestamps/rate, canonical g units, 2-second windows, 250 ms update target, exploratory band, baseline/noise gates, and explicit null output on invalid evidence. Detecting periodic motion is not medical diagnosis.

Expose analyze_window and calibrate_stationary; document their exact types. Preserve loss/reboot/haptic reasons. Export generated fixtures and actual parameter choices. Dev owns the loop that calls this library.
