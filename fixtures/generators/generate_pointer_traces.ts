import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Deterministic PRNG (Mulberry32) for reproducible synthetic datasets.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextGaussian(): number {
    let u1 = this.next();
    let u2 = this.next();
    while (u1 <= 1e-15) {
      u1 = this.next();
    }
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  public nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export interface TraceSample {
  t_ms: number;
  true_x: number;
  true_y: number;
  raw_x: number;
  raw_y: number;
}

export interface SyntheticPointerTrace {
  trace_id: string;
  seed: number;
  sampling_rate_hz: number;
  duration_s: number;
  ground_truth_trajectory: string;
  noise_model: string;
  noise_sigma_px: number;
  samples: TraceSample[];
}

/**
 * 1. Stationary Hover: Intended position is motionless; simulates intentional tremor and sensor jitter.
 */
export function generateStationaryHover(
  seed: number = 42,
  durationS: number = 4.0,
  rateHz: number = 60.0,
  noiseSigma: number = 3.0,
  tremorFreqHz: number = 5.5,
  tremorAmpPx: number = 8.0
): SyntheticPointerTrace {
  const rng = new SeededRandom(seed);
  const totalSamples = Math.round(durationS * rateHz);
  const dtMs = 1000.0 / rateHz;
  const x0 = 400.0;
  const y0 = 300.0;
  const samples: TraceSample[] = [];

  for (let i = 0; i < totalSamples; i++) {
    const tMs = Math.round(i * dtMs * 100) / 100;
    const tSec = tMs / 1000.0;
    const trueX = x0;
    const trueY = y0;

    const tremorX = tremorAmpPx * Math.sin(2 * Math.PI * tremorFreqHz * tSec);
    const tremorY = tremorAmpPx * Math.cos(2 * Math.PI * tremorFreqHz * tSec * 0.9);
    const noiseX = rng.nextGaussian() * noiseSigma;
    const noiseY = rng.nextGaussian() * noiseSigma;

    samples.push({
      t_ms: tMs,
      true_x: Math.round(trueX * 100) / 100,
      true_y: Math.round(trueY * 100) / 100,
      raw_x: Math.round((trueX + tremorX + noiseX) * 100) / 100,
      raw_y: Math.round((trueY + tremorY + noiseY) * 100) / 100,
    });
  }

  return {
    trace_id: `stationary_jitter_seed${seed}`,
    seed,
    sampling_rate_hz: rateHz,
    duration_s: durationS,
    ground_truth_trajectory: 'stationary_hover',
    noise_model: 'gaussian_noise_plus_5_5hz_tremor',
    noise_sigma_px: noiseSigma,
    samples,
  };
}

/**
 * 2. Constant-Velocity Straight Line (Clean and Noisy).
 */
export function generateStraightLine(
  seed: number = 42,
  noisy: boolean = true,
  durationS: number = 3.0,
  rateHz: number = 60.0
): SyntheticPointerTrace {
  const rng = new SeededRandom(seed);
  const totalSamples = Math.round(durationS * rateHz);
  const dtMs = 1000.0 / rateHz;
  const startX = 100.0;
  const startY = 200.0;
  const endX = 700.0;
  const endY = 200.0;
  const noiseSigma = noisy ? 4.5 : 0.0;
  const tremorAmp = noisy ? 6.0 : 0.0;
  const tremorFreq = 5.5;
  const samples: TraceSample[] = [];

  for (let i = 0; i < totalSamples; i++) {
    const tMs = Math.round(i * dtMs * 100) / 100;
    const frac = i / (totalSamples - 1);
    const trueX = startX + frac * (endX - startX);
    const trueY = startY + frac * (endY - startY);

    const tSec = tMs / 1000.0;
    const tremorX = tremorAmp * Math.sin(2 * Math.PI * tremorFreq * tSec);
    const tremorY = tremorAmp * Math.sin(2 * Math.PI * tremorFreq * tSec * 1.1 + 0.5);
    const noiseX = rng.nextGaussian() * noiseSigma;
    const noiseY = rng.nextGaussian() * noiseSigma;

    samples.push({
      t_ms: tMs,
      true_x: Math.round(trueX * 100) / 100,
      true_y: Math.round(trueY * 100) / 100,
      raw_x: Math.round((trueX + tremorX + noiseX) * 100) / 100,
      raw_y: Math.round((trueY + tremorY + noiseY) * 100) / 100,
    });
  }

  return {
    trace_id: noisy ? `straight_line_noisy_seed${seed}` : 'straight_line_clean',
    seed,
    sampling_rate_hz: rateHz,
    duration_s: durationS,
    ground_truth_trajectory: 'linear_constant_velocity',
    noise_model: noisy ? 'gaussian_noise_plus_5_5hz_tremor' : 'none',
    noise_sigma_px: noiseSigma,
    samples,
  };
}

/**
 * 3. Ballistic Movement with Minimum Jerk and Damped Overshoot.
 * Uses Flash & Hogan (1985) s(tau) = 10*tau^3 - 15*tau^4 + 6*tau^5.
 */
export function generateBallisticOvershoot(
  seed: number = 42,
  durationS: number = 3.5,
  rateHz: number = 60.0
): SyntheticPointerTrace {
  const rng = new SeededRandom(seed);
  const totalSamples = Math.round(durationS * rateHz);
  const dtMs = 1000.0 / rateHz;
  const startX = 100.0;
  const startY = 100.0;
  const targetX = 800.0;
  const targetY = 400.0;
  const ballisticDurationS = 1.2;
  const samples: TraceSample[] = [];

  for (let i = 0; i < totalSamples; i++) {
    const tMs = Math.round(i * dtMs * 100) / 100;
    const tSec = tMs / 1000.0;
    let trueX: number;
    let trueY: number;

    if (tSec <= ballisticDurationS) {
      // Flash & Hogan minimum jerk trajectory
      const tau = tSec / ballisticDurationS;
      const s = 10 * Math.pow(tau, 3) - 15 * Math.pow(tau, 4) + 6 * Math.pow(tau, 5);
      trueX = startX + s * (targetX - startX);
      trueY = startY + s * (targetY - startY);
    } else {
      // Damped corrective oscillation around target
      const dtPost = tSec - ballisticDurationS;
      const lambda = 3.5; // decay factor (1/s)
      const fCorr = 4.0; // correction oscillation (Hz)
      const overshootX = 35.0 * Math.exp(-lambda * dtPost) * Math.cos(2 * Math.PI * fCorr * dtPost);
      const overshootY = 20.0 * Math.exp(-lambda * dtPost) * Math.sin(2 * Math.PI * fCorr * dtPost);
      trueX = targetX + overshootX;
      trueY = targetY + overshootY;
    }

    // Tremor + noise
    const tremorX = 6.0 * Math.sin(2 * Math.PI * 6.0 * tSec);
    const tremorY = 6.0 * Math.cos(2 * Math.PI * 6.0 * tSec);
    const noiseX = rng.nextGaussian() * 3.5;
    const noiseY = rng.nextGaussian() * 3.5;

    samples.push({
      t_ms: tMs,
      true_x: Math.round(trueX * 100) / 100,
      true_y: Math.round(trueY * 100) / 100,
      raw_x: Math.round((trueX + tremorX + noiseX) * 100) / 100,
      raw_y: Math.round((trueY + tremorY + noiseY) * 100) / 100,
    });
  }

  return {
    trace_id: `ballistic_overshoot_seed${seed}`,
    seed,
    sampling_rate_hz: rateHz,
    duration_s: durationS,
    ground_truth_trajectory: 'minimum_jerk_ballistic_with_damped_overshoot',
    noise_model: 'gaussian_noise_plus_6hz_tremor',
    noise_sigma_px: 3.5,
    samples,
  };
}

/**
 * 4. Variable Sample Rate (30 Hz to 144 Hz) with Curved Trajectory.
 */
export function generateVariableRateTrace(
  seed: number = 42,
  durationS: number = 4.0
): SyntheticPointerTrace {
  const rng = new SeededRandom(seed);
  const samples: TraceSample[] = [];
  let currentTMs = 0.0;
  const targetTMs = durationS * 1000.0;

  while (currentTMs <= targetTMs) {
    const tSec = currentTMs / 1000.0;
    // Circular arc path
    const angle = (tSec / durationS) * Math.PI * 1.5;
    const trueX = 400.0 + 250.0 * Math.cos(angle);
    const trueY = 300.0 + 200.0 * Math.sin(angle);

    const tremorX = 5.0 * Math.sin(2 * Math.PI * 5.8 * tSec);
    const tremorY = 5.0 * Math.cos(2 * Math.PI * 5.8 * tSec);
    const noiseX = rng.nextGaussian() * 3.0;
    const noiseY = rng.nextGaussian() * 3.0;

    samples.push({
      t_ms: Math.round(currentTMs * 100) / 100,
      true_x: Math.round(trueX * 100) / 100,
      true_y: Math.round(trueY * 100) / 100,
      raw_x: Math.round((trueX + tremorX + noiseX) * 100) / 100,
      raw_y: Math.round((trueY + tremorY + noiseY) * 100) / 100,
    });

    // Inter-sample delta between 6.94ms (144Hz) and 33.33ms (30Hz)
    const dt = rng.nextRange(6.94, 33.33);
    currentTMs += dt;
  }

  return {
    trace_id: 'variable_rate_30_to_144hz',
    seed,
    sampling_rate_hz: 60.0, // nominal
    duration_s: durationS,
    ground_truth_trajectory: 'elliptical_arc',
    noise_model: 'gaussian_noise_plus_tremor_variable_dt',
    noise_sigma_px: 3.0,
    samples,
  };
}

/**
 * Main generator runner writing synthetic trace files.
 */
export function writeAllTraces(targetDir: string): void {
  fs.mkdirSync(targetDir, { recursive: true });

  const traces: SyntheticPointerTrace[] = [
    generateStationaryHover(42),
    generateStraightLine(42, false),
    generateStraightLine(42, true),
    generateBallisticOvershoot(42),
    generateVariableRateTrace(42),
  ];

  for (const trace of traces) {
    const filePath = path.join(targetDir, `${trace.trace_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(trace, null, 2), 'utf-8');
    console.log(`Generated ${trace.samples.length} samples -> ${filePath}`);
  }
}

// CLI entry point
if (process.argv[1]?.endsWith('generate_pointer_traces.ts')) {
  const outDir = path.resolve(process.cwd(), 'fixtures/synthetic/traces');
  writeAllTraces(outDir);
}
