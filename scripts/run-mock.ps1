# Run SteadyHand Bridge in Mock Mode (zero hardware required)

param(
    [string]$Port = "8765",
    [string]$Host = "127.0.0.1",
    [string]$Token = "steadyhand-dev-token-secret"
)

Write-Host "=== Starting SteadyHand Bridge in MOCK Mode on $Host:$Port ===" -ForegroundColor Cyan
$env:PYTHONPATH = "services/bridge/src"

python -m steadyhand_bridge --mode mock --host $Host --port $Port --token $Token
