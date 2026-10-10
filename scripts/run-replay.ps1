# Run SteadyHand Bridge in Replay Mode with a pre-recorded or synthetic fixture

param(
    [string]$Fixture = "packages/contracts/examples/sensor-batch.json",
    [string]$Port = "8765",
    [string]$ListenHost = "127.0.0.1",
    [string]$Token = "steadyhand-dev-token-secret"
)

Write-Host "=== Starting SteadyHand Bridge in REPLAY Mode on ${ListenHost}:${Port} ===" -ForegroundColor Cyan
Write-Host "  Fixture: $Fixture" -ForegroundColor Yellow

$env:PYTHONPATH = "services/bridge/src"

python -m steadyhand_bridge --mode replay --fixture $Fixture --host $ListenHost --port $Port --token $Token
