# Sample Validation and Timebase Plan (`analysis/plans/sample-validation-and-timebase.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

Raw IMU data from embedded microcontrollers over serial or I2C bridges exhibits timing jitter, packet drops, and clock drift. This module validates incoming sample streams and reconstructs a mathematically rigorous timebase before spectral analysis.

### Primary Rule
**Never zero-pad or fake continuity across large data outages.** If sensor data is dropped for $>40\text{ ms}$ or missing fraction exceeds $5\%$, the analysis window is invalid and must be rejected.

---

## 2. Sensor Capability and Units

Analysis adapts dynamically to the negotiated sensor capability:

| Sensor Chip | Typical I2C Addr | Nominal ODR | Range ($\pm g$) | Resolution | Quantization Noise Floor |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LIS3DHTR** | `0x19` / `0x18` | $100\text{ Hz}$ | $2\text{ g}$ | 12-bit | $1\text{ mg/LSB} \approx 0.001\text{ g}$ |
| **ADXL345** | `0x53` | $100\text{ Hz}$ | $2\text{ g}$ | 10-bit | $3.9\text{ mg/LSB} \approx 0.0039\text{ g}$ |
| **MMA7660FC** | `0x4C` | $120\text{ Hz}$ | $1.5\text{ g}$ | 6-bit | $46.9\text{ mg/LSB} \approx 0.047\text{ g}$ |

*Note on MMA7660FC:* With 6-bit resolution, physical motion below $0.05\text{ g}$ is lost to quantization. Analysis flags this resolution limitation rather than manufacturing artificial sensitivity.

---

## 3. Timestamp & Continuity Rules

### 1. MCU Microsecond Timestamps (`t_us`)
All sampling timing relies on the microcontroller clock (`t_us`), NOT the host laptop receipt time. Host arrival time fluctuates due to operating system scheduling and USB packet buffering.

### 2. 32-Bit Microsecond Timer Rollover
A 32-bit unsigned microsecond timer (`uint32_t`) rolls over every:
$$T_{rollover} = \frac{2^{32} - 1}{10^6} \approx 4294.96\text{ seconds} \approx 71.58\text{ minutes}$$
- **Rollover Correction:**
  $$\Delta t = (t_k - t_{k-1}) \pmod{2^{32}}$$
  If $\Delta t < 0$, $\Delta t += 2^{32}$.

### 3. Sequence Number Gap Detection
Samples carry an incrementing integer `seq`.
- $\Delta seq = seq_k - seq_{k-1}$.
- If $\Delta seq > 1$, missing samples count: $N_{missing} += (\Delta seq - 1)$.
- Window missing fraction:
  $$\text{missing\_fraction} = \frac{N_{missing}}{N_{expected}}$$
- If $\text{missing\_fraction} > 0.05$ ($5\%$), reject window (`quality = 'degraded'`).

### 4. Maximum Allowed Gap
- Nominal sampling period at $100\text{ Hz}$ is $T_s = 10\text{ ms}$; at $120\text{ Hz}$ is $T_s = 8.33\text{ ms}$.
- If any single gap $\Delta t_{max} > 40\text{ ms}$ (equivalent to 4 consecutive lost samples), reject window (`quality = 'degraded'`).

---

## 4. Uniform Resampling for FFT

Discrete Fourier Transforms require strictly uniform sampling intervals:
1. Generate target uniform time grid $t_{grid} = [0, \frac{1}{F_s}, \frac{2}{F_s}, \dots, T_{window}]$.
2. For small missing intervals ($\le 40\text{ ms}$), apply 1D linear piecewise interpolation on each axis ($a_x, a_y, a_z$).
3. This fills minor jitter without distorting low-frequency periodic oscillations.

---

## 5. Acceptance Criteria

- Handles $2^{32}$ microsecond rollover without producing negative $\Delta t$.
- Accurately computes missing fraction for synthetic packet drop streams.
- Rejects windows with gaps $>40\text{ ms}$.

---

## 6. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing sample validation and timebase reconstruction in steadyhand_signal.

Read analysis/plans/sample-validation-and-timebase.md and docs/contracts.md.

ALLOWED EDITS:
- analysis/src/steadyhand_signal/validation.py
- analysis/src/steadyhand_signal/resampler.py
- tests/analysis/**

TASK:
1. Implement validation.py verifying:
   - Microsecond rollover wrapping.
   - Sequence number gap counting.
   - Max gap threshold (40ms).
   - Missing fraction threshold (0.05).
   - Sensor clipping/saturation (|a| >= range_g).
2. Implement resampler.py interpolating valid data onto a uniform grid.
3. Add unit tests verifying rollover handling and gap rejection.
```
