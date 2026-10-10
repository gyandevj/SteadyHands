# Setup script for SteadyHand bridge, contracts, and analysis environment

Write-Host "=== Setting up SteadyHand Environment ===" -ForegroundColor Cyan

# 1. Check tools
Write-Host "[1/4] Checking tools..." -ForegroundColor Yellow
node -v
python --version

# 2. Install bridge service dependencies
Write-Host "[2/4] Installing Python bridge service dependencies..." -ForegroundColor Yellow
python -m pip install fastapi uvicorn pydantic httpx websockets numpy pytest

# 3. Verify cross-language contracts
Write-Host "[3/4] Verifying canonical contracts..." -ForegroundColor Yellow
python scripts/check-contracts.py

# 4. Verify analysis integration
Write-Host "[4/4] Verifying signal analysis integration..." -ForegroundColor Yellow
python scripts/check-analysis-integration.py

Write-Host "=== Setup Complete! ===" -ForegroundColor Green
