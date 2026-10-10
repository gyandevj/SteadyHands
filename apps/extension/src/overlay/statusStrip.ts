import { OverlayElements } from './mount.js';
import { SourceState, PointerMode } from '../types/index.js';

export function updateStatusStrip(
  elements: OverlayElements,
  mode: PointerMode,
  source: SourceState,
  deviceConnected: boolean
): void {
  elements.statusDot.className = 'steadyhand-status-dot';

  if (!deviceConnected || source === 'unavailable') {
    elements.statusDot.classList.add('unavailable');
    elements.statusText.textContent = mode === 'stabilized'
      ? 'SteadyHand: Stabilized (Standalone)'
      : 'SteadyHand: Native';
  } else if (source === 'synthetic') {
    elements.statusDot.classList.add('synthetic');
    elements.statusText.textContent = 'SteadyHand (Synthetic Test)';
  } else {
    elements.statusText.textContent = 'SteadyHand: Live Motion';
  }
}
