# Local bridge service

**Owner: Dev.** Read [architecture](../../docs/architecture.md), [contracts](../../docs/contracts.md), and [team prompts](../../teams/01_dev.md).

Implement installable steadyhand_bridge with mock/replay/UNO Q adapters, bounded buffers, auth, calibration, WS state, sessions, and optional haptics. Import steadyhand_signal from analysis. The server cannot control page clicks or pointer coordinates.

Run loopback-first; prove actual board-to-laptop routing before assuming LAN/USB access. Show source and fresh data health separately. Pair HTTP and WS explicitly, validate boundaries, and never forward entered form values.

Fill actual environment setup, adapter selection, endpoint, launch commands, version pins, and failure checks after implementation. P0 must launch with a labeled mock adapter even when hardware is unavailable.
