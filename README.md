# SteadyHand

> **Assistive Web Interaction with Real-Time Tremor Stabilization & Hardware Motion Sensing**

SteadyHand is an accessibility system designed for individuals with hand tremors. It combines:
1. **A Chrome Extension** providing client-side pointer stabilization (1-Euro adaptive filter), intelligent clickable target discovery, and cancellable dwell activation.
2. **An Arduino UNO R4 Peripheral** with a Seeed Studio Grove MMA7660FC 3-axis accelerometer (placed beside the trackpad) and a Grove RGB LCD display providing real-time tremor feature extraction.
3. **A Python FastAPI Bridge Service** streaming validated motion metrics over WebSockets to the browser extension.

---

## 🚀 Quick Start: How to Run

### 1. Prerequisites
- **Node.js** v18+ and `npm`
- **Python** 3.10+ with `pip`
- (Optional for hardware) **Arduino UNO R4 WiFi** plugged in via USB (e.g. `COM5`)

### 2. Initial Setup
Run the setup script from the root repository directory to install Node and Python dependencies:

```powershell
# From the repository root:
.\scripts\setup.ps1
```

Or install manually:
```powershell
npm install
pip install -e services/bridge
pip install pyserial
npm run build --prefix apps/extension
```

---

### 3. Running the Bridge Service

Choose one of three modes depending on available hardware:

#### Option A: Hardware Mode (Connected Arduino)
With your Arduino UNO R4 connected via USB to `COM5`:
```powershell
.\scripts\run-hardware.ps1 -DevicePort "COM5"
```
The bridge connects to the Arduino at 115200 baud, reads live accelerometer data, processes tremor analysis windows, and streams metrics on `ws://127.0.0.1:8765/v1/stream`.

#### Option B: Mock Mode (Zero Hardware Required)
Simulate realistic tremor and intentional movement completely in software:
```powershell
.\scripts\run-mock.ps1
```

#### Option C: Replay Mode (Pre-recorded Tremor Data)
Replay canonical recorded accelerometer datasets:
```powershell
.\scripts\run-replay.ps1 -Fixture "packages/contracts/examples/sensor-batch.json"
```

---

### 4. Running the Chrome Extension

1. **Build the extension bundle** (if not already built):
   ```powershell
   npm run build --prefix apps/extension
   ```
2. **Load into Google Chrome**:
   - Navigate to `chrome://extensions/` in your browser.
   - Toggle **Developer mode** (top right corner) to **ON**.
   - Click **Load unpacked** (top left corner).
   - Select the `apps/extension/dist` folder in this repository.
3. **Use the Extension**:
   - Open any webpage (e.g. form, documentation, or search page).
   - Click the **SteadyHand** extension icon in your Chrome toolbar.
   - Click **"Enable on this page"**.
   - The virtual stabilized cursor and target snap rings are now active! The popup will display live sensor status and tremor metrics when the bridge is running.

---

## 🧪 Running Verification & Tests

To execute the entire test suite across contracts, analysis, backend bridge, and extension:

```powershell
.\scripts\test-all.ps1
```

Or run individual test suites:
- **Contracts Schemas**: `npm test --prefix packages/contracts`
- **Signal Analysis Pipeline**: `pytest tests/analysis`
- **Bridge Backend Service**: `pytest services/bridge/tests`
- **Chrome Extension Runtime**: `npm test --prefix apps/extension`

---

## 🛠️ Hardware Setup

- **Microcontroller**: Arduino UNO R4 WiFi
- **Shield**: Seeed Studio Grove Base Shield (set to 5V logic)
- **Sensor**: Grove MMA7660FC 3-axis accelerometer (I2C address `0x4C`), placed beside the laptop trackpad to capture hand tremors.
- **Display**: Grove LCD RGB Backlight v4 (I2C address `0x3E` controller, `0x62` backlight), displays live X/Y coordinates and status with solid white backlight.
- **Firmware Location**: `firmware/unoq/steadyhand/` (flashable via Arduino CLI or Arduino IDE with the `arduino:renesas_uno:unor4wifi` core).

---

## 📁 Repository Structure

| Directory | Description |
| --- | --- |
| `apps/extension/` | Manifest V3 Chrome Extension (background worker, content script, popup UI, overlay) |
| `services/bridge/` | FastAPI WebSocket bridge connecting hardware/mock streams to the extension |
| `packages/contracts/` | Shared TypeScript and Python contract schemas and validation fixtures |
| `packages/engine/` | Pointer filtering (1-Euro adaptive filter) and target candidate selection |
| `analysis/` | Signal processing, FFT analysis, band RMS, and stationary calibration |
| `firmware/unoq/` | Arduino UNO R4 firmware for Grove MMA7660FC and LCD display |
| `scripts/` | One-click PowerShell scripts for setup, launch, and automated testing |
