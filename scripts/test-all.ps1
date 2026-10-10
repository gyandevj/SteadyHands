# Comprehensive test suite execution for Dev subsystem

Write-Host "=== Running SteadyHand Test Suite ===" -ForegroundColor Cyan

# 1. Cross-language contract checks
Write-Host "[1/3] Running cross-language contract checks..." -ForegroundColor Yellow
$env:PYTHONPATH = "services/bridge/src"
python scripts/check-contracts.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 2. Python backend tests
Write-Host "[2/3] Running Python bridge tests..." -ForegroundColor Yellow
python -m pytest services/bridge/tests -v
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3. TypeScript contract tests
Write-Host "[3/3] Running TypeScript contracts tests..." -ForegroundColor Yellow
node --test packages/contracts/tests/contracts.test.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== ALL TESTS PASSED! ===" -ForegroundColor Green
