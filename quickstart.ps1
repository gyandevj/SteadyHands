# ============================================================
# SteadyHand Hackathon Quick Start Script
# Runs out-of-the-box for any teammate pulling the repository.
# Auto-detects physical Arduino hardware, or falls back to Mock mode.
# ============================================================

param(
    [string]$Port = "8765",
    [string]$ListenHost = "127.0.0.1",
    [string]$Token = "steadyhand-dev-token-secret",
    [string]$DevicePort = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          SteadyHand --- Hackathon Quick Start" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Python and Node
Write-Host "[1/4] Checking environment dependencies..." -ForegroundColor Yellow
if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not in PATH. Please install Python 3.10+."
    exit 1
}
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not installed or not in PATH. Please install Node.js 18+."
    exit 1
}

# 2. Build Extension Bundle if needed
Write-Host "[2/4] Ensuring Chrome Extension is built..." -ForegroundColor Yellow
if (-not (Test-Path "$RepoRoot\apps\extension\dist\manifest.json")) {
    Write-Host "  Building extension bundle into apps/extension/dist/..." -ForegroundColor Gray
    npm run build --prefix "$RepoRoot\apps\extension" | Out-Null
} else {
    Write-Host "  Extension bundle ready in apps/extension/dist/" -ForegroundColor Green
}

# Ensure python bridge package installed
Write-Host "  Ensuring Python bridge dependencies..." -ForegroundColor Gray
$env:PYTHONPATH = "$RepoRoot\services\bridge\src"
python -m pip install -q -e "$RepoRoot\services\bridge" pyserial | Out-Null

# 3. Check for Connected Hardware vs Mock Mode
Write-Host "[3/4] Detecting hardware..." -ForegroundColor Yellow
$HardwarePort = $DevicePort
if ($HardwarePort -eq "") {
    try {
        $PyCmd = 'import serial.tools.list_ports as lp; pts = [p.device for p in lp.comports() if (p.vid == 0x2341 or "USB" in (p.hwid or "").upper())]; pts = pts or [p.device for p in lp.comports() if "BTH" not in (p.hwid or "").upper() and "BLUETOOTH" not in (p.description or "").upper()]; print(pts[0] if pts else "")'
        $Detected = python -c $PyCmd 2>$null
        if ($Detected) {
            $HardwarePort = "$Detected".Trim()
        }
    } catch {}
}

$LaunchMode = "mock"
if ($HardwarePort -ne "") {
    Write-Host "  Physical Arduino detected on port: $HardwarePort" -ForegroundColor Green
    Write-Host "  Starting in HARDWARE Mode!" -ForegroundColor Green
    $LaunchMode = "uno_q"
} else {
    Write-Host "  No physical Arduino detected." -ForegroundColor DarkYellow
    Write-Host "  Starting in MOCK Mode (software-simulated realistic tremor data)." -ForegroundColor Cyan
    $LaunchMode = "mock"
}

# 4. Open Test Form & Diagnostics Monitor in Browser
Write-Host "[4/4] Launching test form and tremor oscilloscope in browser..." -ForegroundColor Yellow
$FormPath = "$RepoRoot\apps\fixtures\registration.html"
$MonitorPath = "$RepoRoot\apps\fixtures\monitor.html"
$DistPath = "$RepoRoot\apps\extension\dist"

Write-Host ""
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "CHROME EXTENSION SETUP:" -ForegroundColor White
Write-Host "1. In Google Chrome, navigate to: chrome://extensions/" -ForegroundColor Cyan
Write-Host "2. Enable 'Developer mode' (toggle in top right)." -ForegroundColor Cyan
Write-Host "3. Click 'Load unpacked' and select this folder:" -ForegroundColor Cyan
Write-Host "   $DistPath" -ForegroundColor Yellow
Write-Host "4. Open the form, click SteadyHand icon -> 'Enable on this page'!" -ForegroundColor Green
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

$FormUri = "file:///" + ($FormPath -replace '\\', '/')
$MonitorUri = "file:///" + ($MonitorPath -replace '\\', '/')
Start-Process $FormUri
Start-Process $MonitorUri

Write-Host "Starting SteadyHand WebSocket Bridge on ${ListenHost}:${Port}..." -ForegroundColor Cyan
Write-Host "(Press CTRL+C anytime to stop the server)" -ForegroundColor Gray
Write-Host ""

if ($LaunchMode -eq "uno_q") {
    python -m steadyhand_bridge --mode uno_q --device-port $HardwarePort --host $ListenHost --port $Port --token $Token
} else {
    python -m steadyhand_bridge --mode mock --host $ListenHost --port $Port --token $Token
}
