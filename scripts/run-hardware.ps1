# Run SteadyHand Bridge in Hardware Mode connecting to Arduino UNO Q

param(
    [string]$DevicePort = "COM5",
    [string]$Port = "8765",
    [string]$Host = "127.0.0.1",
    [string]$Token = "steadyhand-dev-token-secret"
)

Write-Host "=== Starting SteadyHand Bridge in HARDWARE Mode on $Host:$Port ===" -ForegroundColor Cyan
Write-Host "  Arduino UNO Q Port: $DevicePort" -ForegroundColor Yellow

$env:PYTHONPATH = "services/bridge/src"

python -m steadyhand_bridge --mode uno_q --device-port $DevicePort --host $Host --port $Port --token $Token
