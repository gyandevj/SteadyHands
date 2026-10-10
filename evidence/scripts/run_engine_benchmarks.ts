import * as fs from 'node:fs';
import * as path from 'node:path';
import { PassthroughFilter } from '../../packages/engine/src/filters/passthrough.ts';
import { ExponentialFilter } from '../../packages/engine/src/filters/exponential.ts';
import { OneEuroFilter } from '../../packages/engine/src/filters/one_euro.ts';
import type { IPointerFilter } from '../../packages/engine/src/filters/types.ts';
import type { SyntheticPointerTrace, TraceSample } from '../../fixtures/generators/generate_pointer_traces.ts';

interface BenchmarkMetric {
  algorithm: string;
  config: Record<string, number | string>;
  stationary_jitter_attenuation_pct: number;
  stationary_rmse_px: number;
  ballistic_rmse_px: number;
  sweep_phase_lag_ms: number;
  sweep_tracking_error_px: number;
}

function calcStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calcRmse(filtered: { x: number; y: number }[], truePoints: { x: number; y: number }[]): number {
  let sumSq = 0;
  for (let i = 0; i < filtered.length; i++) {
    const dx = filtered[i].x - truePoints[i].x;
    const dy = filtered[i].y - truePoints[i].y;
    sumSq += dx * dx + dy * dy;
  }
  return Math.sqrt(sumSq / filtered.length);
}

function evaluateFilter(
  filter: IPointerFilter,
  stationaryTrace: SyntheticPointerTrace,
  sweepTrace: SyntheticPointerTrace,
  ballisticTrace: SyntheticPointerTrace
): {
  stationary_jitter_attenuation_pct: number;
  stationary_rmse_px: number;
  ballistic_rmse_px: number;
  sweep_phase_lag_ms: number;
  sweep_tracking_error_px: number;
} {
  // 1. Stationary Evaluation
  filter.reset();
  const statFiltered: { x: number; y: number }[] = [];
  const statRawErrors: number[] = [];
  const statFilteredErrors: number[] = [];

  for (const s of stationaryTrace.samples) {
    const out = filter.filter({ x: s.raw_x, y: s.raw_y, tMs: s.t_ms });
    statFiltered.push({ x: out.x, y: out.y });
    statRawErrors.push(Math.hypot(s.raw_x - s.true_x, s.raw_y - s.true_y));
    statFilteredErrors.push(Math.hypot(out.x - s.true_x, out.y - s.true_y));
  }

  // Skip warm-up (first 15 samples)
  const warmUp = 15;
  const rawStd = calcStdDev(statRawErrors.slice(warmUp));
  const filtStd = calcStdDev(statFilteredErrors.slice(warmUp));
  const jitterAttPct = Math.max(0, Math.min(100, ((rawStd - filtStd) / rawStd) * 100));
  const statRmse = calcRmse(
    statFiltered.slice(warmUp),
    stationaryTrace.samples.slice(warmUp).map((s) => ({ x: s.true_x, y: s.true_y }))
  );

  // 2. Linear Sweep Phase Lag Evaluation (400 px/s)
  filter.reset();
  const sweepFiltered: { x: number; y: number }[] = [];
  const sweepLags: number[] = [];
  const sweepErrors: number[] = [];

  for (const s of sweepTrace.samples) {
    const out = filter.filter({ x: s.raw_x, y: s.raw_y, tMs: s.t_ms });
    sweepFiltered.push({ x: out.x, y: out.y });
  }

  // In the constant velocity portion (samples 30 to 150), estimate spatial lag
  const sweepSpeedPxPerSec = 200.0; // from trace generator
  for (let i = 30; i < Math.min(150, sweepTrace.samples.length); i++) {
    const s = sweepTrace.samples[i];
    const spatialLagPx = s.raw_x - sweepFiltered[i].x;
    sweepLags.push((spatialLagPx / sweepSpeedPxPerSec) * 1000.0);
    sweepErrors.push(Math.hypot(sweepFiltered[i].x - s.true_x, sweepFiltered[i].y - s.true_y));
  }
  const meanLagMs = Math.max(0, sweepLags.reduce((a, b) => a + b, 0) / sweepLags.length);
  const meanSweepErr = sweepErrors.reduce((a, b) => a + b, 0) / sweepErrors.length;

  // 3. Ballistic Overshoot Evaluation
  filter.reset();
  const ballisticFiltered: { x: number; y: number }[] = [];
  for (const s of ballisticTrace.samples) {
    const out = filter.filter({ x: s.raw_x, y: s.raw_y, tMs: s.t_ms });
    ballisticFiltered.push({ x: out.x, y: out.y });
  }
  const ballisticRmse = calcRmse(
    ballisticFiltered.slice(warmUp),
    ballisticTrace.samples.slice(warmUp).map((s) => ({ x: s.true_x, y: s.true_y }))
  );

  return {
    stationary_jitter_attenuation_pct: Math.round(jitterAttPct * 10) / 10,
    stationary_rmse_px: Math.round(statRmse * 100) / 100,
    ballistic_rmse_px: Math.round(ballisticRmse * 100) / 100,
    sweep_phase_lag_ms: Math.round(meanLagMs * 10) / 10,
    sweep_tracking_error_px: Math.round(meanSweepErr * 100) / 100,
  };
}

export function runBenchmarks(): void {
  const tracesDir = path.resolve(process.cwd(), 'fixtures/synthetic/traces');
  const outDir = path.resolve(process.cwd(), 'evidence/benchmarks');
  fs.mkdirSync(outDir, { recursive: true });

  const stationaryTrace: SyntheticPointerTrace = JSON.parse(
    fs.readFileSync(path.join(tracesDir, 'stationary_jitter_seed42.json'), 'utf-8')
  );
  const sweepTrace: SyntheticPointerTrace = JSON.parse(
    fs.readFileSync(path.join(tracesDir, 'straight_line_noisy_seed42.json'), 'utf-8')
  );
  const ballisticTrace: SyntheticPointerTrace = JSON.parse(
    fs.readFileSync(path.join(tracesDir, 'ballistic_overshoot_seed42.json'), 'utf-8')
  );

  const results: BenchmarkMetric[] = [];

  // Baseline 1: Passthrough (Raw)
  results.push({
    algorithm: 'Passthrough (Raw Virtual)',
    config: {},
    ...evaluateFilter(new PassthroughFilter(), stationaryTrace, sweepTrace, ballisticTrace),
  });

  // Series 2: Exponential Filter parameter sweep (cutoff from 0.5Hz to 5.0Hz)
  const expCutoffs = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0];
  for (const fc of expCutoffs) {
    results.push({
      algorithm: 'ExponentialFilter',
      config: { cutoff_hz: fc },
      ...evaluateFilter(new ExponentialFilter(fc), stationaryTrace, sweepTrace, ballisticTrace),
    });
  }

  // Series 3: One Euro Filter parameter sweep (beta sweep with fc_min = 1.0Hz)
  const oneEuroBetas = [0.0005, 0.001, 0.002, 0.005, 0.01];
  for (const beta of oneEuroBetas) {
    results.push({
      algorithm: 'OneEuroFilter',
      config: { min_cutoff_hz: 1.0, beta, d_cutoff_hz: 1.0 },
      ...evaluateFilter(new OneEuroFilter(1.0, beta, 1.0), stationaryTrace, sweepTrace, ballisticTrace),
    });
  }

  // Series 4: One Euro Filter with fc_min = 0.5Hz and 2.0Hz for Pareto comparison
  results.push({
    algorithm: 'OneEuroFilter',
    config: { min_cutoff_hz: 0.5, beta: 0.005, d_cutoff_hz: 1.0 },
    ...evaluateFilter(new OneEuroFilter(0.5, 0.005, 1.0), stationaryTrace, sweepTrace, ballisticTrace),
  });
  results.push({
    algorithm: 'OneEuroFilter',
    config: { min_cutoff_hz: 2.0, beta: 0.005, d_cutoff_hz: 1.0 },
    ...evaluateFilter(new OneEuroFilter(2.0, 0.005, 1.0), stationaryTrace, sweepTrace, ballisticTrace),
  });

  const benchmarkPayload = {
    benchmark_id: 'pareto_jitter_vs_lag',
    timestamp_utc: new Date().toISOString(),
    provenance: {
      generator: 'evidence/scripts/run_engine_benchmarks.ts',
      seed: 42,
      input_traces: [
        'stationary_jitter_seed42.json',
        'straight_line_noisy_seed42.json',
        'ballistic_overshoot_seed42.json',
      ],
      description: 'Offline filter Pareto evaluation: stationary jitter reduction vs movement phase lag',
    },
    metrics: results,
  };

  const outFile = path.join(outDir, 'latency_vs_jitter.json');
  fs.writeFileSync(outFile, JSON.stringify(benchmarkPayload, null, 2), 'utf-8');
  console.log(`Saved benchmark Pareto metrics (${results.length} configurations) -> ${outFile}`);
}

if (process.argv[1]?.endsWith('run_engine_benchmarks.ts')) {
  runBenchmarks();
}
