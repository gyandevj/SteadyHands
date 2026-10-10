# Windowing and Spectral Analysis Plan (`analysis/plans/windowing-and-spectral-analysis.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document details the discrete Fourier analysis pipeline in `steadyhand_signal.spectral`. It transforms 3-axis accelerometer time-series into Power Spectral Density (PSD) representations to quantify tremor frequencies and signal power.

---

## 2. Windowing Parameters & Stride

- **Window Length ($T_w$):** $2.0\text{ seconds}$ ($N = 200\text{ samples}$ at $100\text{ Hz}$, $N = 240\text{ samples}$ at $120\text{ Hz}$).
- **Frequency Resolution ($\Delta f$):** $\Delta f = \frac{1}{T_w} = \frac{1}{2.0} = 0.5\text{ Hz}$.
  *(Note: Zero-padding increases display interpolation, but does NOT improve physical frequency resolution).*
- **Update Cadence ($\Delta t_{update}$):** $250\text{ ms}$ ($4\text{ Hz}$ output rate).
- **Window Overlap:** $75\%$ overlap ($1.75\text{ seconds}$ reused, $0.25\text{ seconds}$ fresh).

---

## 3. Mathematical Pipeline

### Step 1: Per-Axis Detrending (Gravity Removal)
The static gravitational acceleration vector $\vec{g}$ ($\approx 1.0\text{ g}$) creates an immense zero-frequency (DC) spike that leaks into low-frequency bins.
- For each axis $u \in \{x, y, z\}$:
  $$\tilde{a}_u[n] = a_u[n] - \mu_u, \quad \text{where } \mu_u = \frac{1}{N}\sum_{k=0}^{N-1} a_u[k]$$
- This removes static gravity orientation without distorting dynamic movement frequencies.

### Step 2: The Mathematical Flaw of Magnitude Analysis
**Why we do NOT analyze Euclidean magnitude $\|a(t)\| = \sqrt{a_x^2 + a_y^2 + a_z^2}$:**
1. The Euclidean norm is a non-linear operator. For an oscillation $a_x(t) = g + A\sin(\omega t)$, the Taylor expansion of $\|a(t)\|$ introduces harmonic distortion at $2\omega, 3\omega$, intermodulation products across axes, and folds DC offsets into pseudo-peaks.
2. Conversely, Fourier transformation is linear. Computing PSD independently on $a_x, a_y, a_z$ and summing the spectral power preserves exact physical vibration frequencies:
   $$PSD_{total}(f) = PSD_x(f) + PSD_y(f) + PSD_z(f)$$

### Step 3: Hann Windowing
To attenuate spectral leakage from finite window boundaries:
$$w[n] = 0.5 \left(1 - \cos\left(\frac{2\pi n}{N-1}\right)\right)$$
Window energy normalization factor:
$$S_2 = \sum_{n=0}^{N-1} w[n]^2$$

### Step 4: One-Sided Power Spectral Density (PSD)
For each axis, apply the windowed Real FFT ($rfft$):
$$X_u[k] = \sum_{n=0}^{N-1} (\tilde{a}_u[n] \cdot w[n]) e^{-j \frac{2\pi k n}{N}}, \quad k = 0, \dots, N/2$$
Normalized one-sided PSD ($g^2/\text{Hz}$):
$$P_u(f_k) = \begin{cases}
\frac{|X_u[0]|^2}{F_s \cdot S_2}, & k = 0 \\
\frac{2 |X_u[k]|^2}{F_s \cdot S_2}, & 1 \le k < N/2 \\
\frac{|X_u[N/2]|^2}{F_s \cdot S_2}, & k = N/2
\end{cases}$$
Total PSD:
$$P_{total}(f_k) = P_x(f_k) + P_y(f_k) + P_z(f_k)$$

---

## 4. Feature Extraction ($3\text{–}12\text{ Hz}$ Exploratory Band)

1. **Band Power & Band RMS ($g$):**
   $$P_{band} = \sum_{f_k \in [3.0, 12.0]} P_{total}(f_k) \cdot \Delta f$$
   $$\text{RMS}_{band} = \sqrt{P_{band}}$$
2. **Total Dynamic Power:**
   $$P_{total} = \sum_{f_k > 0} P_{total}(f_k) \cdot \Delta f$$
3. **Band Power Ratio:**
   $$\text{Ratio} = \frac{P_{band}}{P_{total}}$$
4. **Dominant Frequency via Parabolic Interpolation:**
   Locate peak bin $k_{peak}$ in the $3\text{–}12\text{ Hz}$ band. If $y_1 = P(k-1), y_2 = P(k), y_3 = P(k+1)$:
   $$\delta = \frac{1}{2} \frac{y_1 - y_3}{y_1 - 2y_2 + y_3}$$
   $$f_{dominant} = (k_{peak} + \delta) \cdot \Delta f$$
5. **Peak Concentration:**
   $$\text{Concentration} = \frac{\sum_{k \in [k_{peak}-1, k_{peak}+1]} P(f_k) \cdot \Delta f}{P_{band}}$$

---

## 5. Acceptance Criteria

- **Synthetic Frequency Test:** A synthetic sine wave at $5.3\text{ Hz}$ yields $f_{dominant} = 5.3 \pm 0.2\text{ Hz}$.
- **Energy Conservation (Parseval's Theorem):** Integrated PSD matches time-domain variance $\sigma^2$ within $\pm 2\%$.
- **Execution Speed:** Full 3-axis PSD and feature extraction executes in $<2.5\text{ ms}$ on 200 samples.

---

## 6. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing spectral analysis in steadyhand_signal.spectral.

Read analysis/plans/windowing-and-spectral-analysis.md.

ALLOWED EDITS:
- analysis/src/steadyhand_signal/spectral.py
- analysis/src/steadyhand_signal/features.py
- tests/analysis/**

TASK:
1. Implement compute_axis_psd in spectral.py:
   - Per-axis mean removal (detrending).
   - Hann window multiplication.
   - rfft computation and power scaling (2 / (Fs * S2)).
   - Summing PSDs across X, Y, Z.
2. Implement extract_features in features.py:
   - Band RMS in 3.0-12.0 Hz.
   - Band power ratio (band / total AC power).
   - Dominant frequency via parabolic peak interpolation.
   - Peak concentration.
3. Implement tests/analysis/test_spectral.py validating peak recovery and Parseval energy conservation.
```
