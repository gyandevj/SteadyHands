import { Target } from '../types/index.js';
import { OverlayElements } from './mount.js';

export function updateCandidateOverlay(
  elements: OverlayElements,
  candidateTarget: Target | null,
  ambiguous: boolean
): void {
  if (!candidateTarget) {
    elements.candidateBox.classList.remove('visible', 'ambiguous');
    return;
  }

  const { rect } = candidateTarget;
  elements.candidateBox.style.left = `${rect.x}px`;
  elements.candidateBox.style.top = `${rect.y}px`;
  elements.candidateBox.style.width = `${rect.width}px`;
  elements.candidateBox.style.height = `${rect.height}px`;

  elements.candidateBox.classList.add('visible');
  if (ambiguous) {
    elements.candidateBox.classList.add('ambiguous');
  } else {
    elements.candidateBox.classList.remove('ambiguous');
  }
}
