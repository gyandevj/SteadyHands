# Benchmark Results and Plots Plan (`evidence/plans/benchmark-results-and-plots.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document details the generation of visual charts and benchmark summaries for SteadyHand. All plots must be automatically generated from reproducible benchmark runs and labeled with explicit engineering units and source tags.

---

## 2. Benchmark Visualizations Planned

### Plot 1: The Filtering Pareto Frontier (`plots/pareto_jitter_vs_lag.png`)
- **X-Axis:** Phase Lag at $400\text{ px/s}$ movement ($\text{ms}$, lower is better).
- **Y-Axis:** Stationary Jitter Attenuation ($\%$, higher is better).
- **Traces:**
  - *Exponential Filter Curve:* Generated across cutoffs $f_c \in [0.5, 5.0]\text{ Hz}$. Demonstrates that static low-pass filtering cannot reduce jitter without incurring heavy phase delay.
  - *One Euro Filter Curve:* Generated across $\beta \in [0.0005, 0.01]$ with $f_{c,min} = 1.0\text{ Hz}$. Demonstrates an optimal Pareto-dominant curve (high jitter suppression at rest, low lag at speed).

### Plot 2: Power Spectral Density Recovery (`plots/psd_dominant_peaks.png`)
- **X-Axis:** Frequency ($0\text{ to }50\text{ Hz}$), resolution $\Delta f = 0.5\text{ Hz}$.
- **Y-Axis:** Summed One-Sided PSD ($g^2/\text{Hz}$, logarithmic or linear scale).
- **Visual Annotations:**
  - Shaded highlight over $3.0\text{–}12.0\text{ Hz}$ exploratory motion band.
  - Clear markers on dominant peak (e.g. $5.0\text{ Hz}$) and noise floor ($<0.001\text{ g}^2/\text{Hz}$).

### Plot 3: Fitts' Law Task Throughput (`plots/completion_time_by_mode.png`)
- **X-Axis:** Assistance Mode (`Native`, `Stabilized Click`, `Stabilized Dwell`).
- **Y-Axis:** Effective Throughput ($TP$ in bits/second) and Error Rate ($\%$).

---

## 3. Automated Generation Scripts

### TypeScript Engine Benchmarker (`scripts/run_engine_benchmarks.ts`)
Executes offline simulations across 100 seeded cursor traces:
```bash
npx ts-node evidence/scripts/run_engine_benchmarks.ts --out evidence/benchmarks/offline_filter_pareto.json
```

### Python Matplotlib Plotter (`scripts/plot_spectral_evidence.py`)
Renders publication-ready PNG/SVG figures from JSON benchmark dumps:
```bash
python evidence/scripts/plot_spectral_evidence.py \
  --input evidence/benchmarks/offline_filter_pareto.json \
  --outdir evidence/plots/
```

---

## 4. Acceptance Criteria

- All plot scripts execute headless in CI.
- Charts include title, axis units, legend, and provenance source tags.

---

## 5. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) implementing benchmark generation and plotting in evidence/.

Read evidence/plans/benchmark-results-and-plots.md.

ALLOWED EDITS:
- evidence/scripts/**
- evidence/plots/**

TASK:
1. Implement evidence/scripts/run_engine_benchmarks.ts generating Pareto data.
2. Implement evidence/scripts/plot_spectral_evidence.py generating pareto_jitter_vs_lag.png and psd_dominant_peaks.png using matplotlib.
3. Validate that generated plots contain units, axis labels, and source tags.
```
