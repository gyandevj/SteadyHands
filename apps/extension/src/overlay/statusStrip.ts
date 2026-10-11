import { OverlayElements } from './mount.js';
import { SourceState, PointerMode } from '../types/index.js';

export function updateStatusStrip(
  elements: OverlayElements,
  mode: PointerMode,
  source: SourceState,
  deviceConnected: boolean,
  motionStatus: string = 'quiet',
  dominantHz: number | null = null
): void {
  elements.statusDot.className = 'steadyhand-status-dot';

  if (!deviceConnected || source === 'unavailable') {
    elements.statusDot.classList.add('unavailable');
    elements.statusDot.style.background = '';
    elements.statusText.textContent = mode === 'stabilized'
      ? 'SteadyHand: Stabilized (Standalone)'
      : 'SteadyHand: Native';
  } else if (motionStatus === 'periodic_motion') {
    elements.statusDot.style.background = '#f59e0b';
    const hzStr = dominantHz ? ` (${dominantHz.toFixed(1)} Hz)` : '';
    elements.statusText.textContent = `SteadyHand: Tremor Damping${hzStr}`;
  } else if (motionStatus === 'other_motion') {
    elements.statusDot.style.background = '#38bdf8';
    elements.statusText.textContent = 'SteadyHand: Active Motion';
  } else if (source === 'synthetic') {
    elements.statusDot.classList.add('synthetic');
    elements.statusDot.style.background = '';
    elements.statusText.textContent = 'SteadyHand (Synthetic Test)';
  } else {
    elements.statusDot.style.background = '#10b981';
    elements.statusText.textContent = 'SteadyHand: Live Calm';
  }
}
