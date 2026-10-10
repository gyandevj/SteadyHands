/**
 * Public exports for @steadyhand/engine
 */

export * from './types.ts';
export { ExponentialFilter } from './filters/exponential.ts';
export { OneEuroFilter } from './filters/one_euro.ts';
export { PassthroughFilter } from './filters/passthrough.ts';
export { distanceToRect } from './targeting/distance.ts';
export { TargetArbitrator } from './targeting/arbitrator.ts';
export { DwellStateMachine } from './dwell/state_machine.ts';
export { DwellState } from './dwell/types.ts';
export { PRESETS, resolveConfig } from './presets.ts';
export { InteractionEngineImpl, createInteractionEngine } from './engine.ts';
