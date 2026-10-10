import { unmountOverlay } from '../overlay/mount.js';
import { pointerInput } from './pointerInput.js';

export function teardownSteadyHand(): void {
  // 1. Remove overlay elements from DOM
  unmountOverlay();

  // 2. Restore native cursor
  pointerInput.restoreNativeCursor();

  // 3. Stop pointer event listeners
  pointerInput.stop();

  // 4. Remove injected window guard
  if ((window as any).__STEADYHAND_INJECTED__) {
    delete (window as any).__STEADYHAND_INJECTED__;
  }

  console.log('[SteadyHand] Content runtime cleanly detached.');
}
