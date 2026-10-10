# End-to-End Demo Smoke Test

Write-Host "=== Starting SteadyHand Demo Smoke Test ===" -ForegroundColor Cyan

$env:PYTHONPATH = "services/bridge/src"

# Start bridge service in background
$proc = Start-Process python -ArgumentList "-m steadyhand_bridge --mode mock --port 8765" -PassThru -WindowStyle Hidden

try {
    Write-Host "Waiting for service to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3

    # Run client smoke test
    python scripts/smoke_client.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Smoke test client failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}
finally {
    Write-Host "Stopping background bridge process..." -ForegroundColor Cyan
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force
    }
}

Write-Host "=== Smoke Test Finished Successfully! ===" -ForegroundColor Green
