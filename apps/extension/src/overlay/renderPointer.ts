import { EngineOutput } from '../types/index.js';
import { OverlayElements } from './mount.js';

const CIRCUMFERENCE = 113.1;

export function updatePointerOverlay(
  elements: OverlayElements,
  output: EngineOutput,
  visible = true
): void {
  if (!visible) {
    elements.pointer.style.display = 'none';
    elements.dwellRing.style.display = 'none';
    return;
  }

  elements.pointer.style.display = 'block';
  elements.dwellRing.style.display = 'block';

  // Position virtual pointer
  elements.pointer.style.left = `${output.pointer.x}px`;
  elements.pointer.style.top = `${output.pointer.y}px`;

  if (output.ambiguous) {
    elements.pointer.classList.add('ambiguous');
  } else {
    elements.pointer.classList.remove('ambiguous');
  }

  // Position dwell ring
  elements.dwellRing.style.left = `${output.pointer.x}px`;
  elements.dwellRing.style.top = `${output.pointer.y}px`;

  // Update dwell progress (0 to 1)
  if (output.dwellProgress > 0) {
    elements.dwellRing.classList.add('active');
    const offset = CIRCUMFERENCE * (1 - Math.min(Math.max(output.dwellProgress, 0), 1));
    elements.dwellCircleFg.style.strokeDashoffset = `${offset}`;
  } else {
    elements.dwellRing.classList.remove('active');
    elements.dwellCircleFg.style.strokeDashoffset = `${CIRCUMFERENCE}`;
  }
}
