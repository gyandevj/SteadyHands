# SteadyHand Scripts and Launch Commands

**Owner: Dev.**

Executable setup, launch, and verification scripts for the SteadyHand bridge service, contracts, and firmware.

## Available Scripts

| Script | Language / Shell | Purpose |
| --- | --- | --- |
| `scripts/setup.ps1` | PowerShell | Verifies Node & Python, installs bridge requirements, runs contract checks |
| `scripts/run-mock.ps1` | PowerShell | Starts bridge service in mock mode (`--mode mock`, port 8765) |
| `scripts/run-replay.ps1` | PowerShell | Starts bridge service in replay mode (`--mode replay`, port 8765) |
| `scripts/run-hardware.ps1` | PowerShell | Starts bridge service in hardware mode (`--mode uno_q`, port 8765) |
| `scripts/test-all.ps1` | PowerShell | Runs all contract checks, Python tests, and TypeScript tests |
| `scripts/demo-smoke.ps1` | PowerShell | Launches mock bridge in background, executes end-to-end smoke check, and cleanly stops |
| `scripts/check-contracts.py` | Python 3 | Validates canonical example JSON payloads across Python and TypeScript |
| `scripts/check-analysis-integration.py` | Python 3 | Validates Dedeepya analysis algorithm integration with synthetic signals |
| `scripts/smoke_client.py` | Python 3 | End-to-end client connecting to HTTP endpoints and WebSocket `/v1/stream` |
