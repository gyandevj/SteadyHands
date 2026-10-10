import { runtime } from './runtime.js';

// Initialize SteadyHand content script runtime
runtime.init().catch((err) => {
  console.error('[SteadyHand] Failed to initialize content runtime:', err);
});
