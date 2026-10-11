/**
 * Typed interfaces for UI adapters (Popup, Options, Dashboard).
 * Conforms to docs/contracts.md Section 11.
 */

import type { AssistanceConfig } from './settings.ts';
import type { DataSource, QualityState, MotionStatus, AdvisoryRecommendation, MotionFrame, CalibrationResult } from './device.ts';

export interface UIState {
  readonly enabled: boolean;
  readonly config: AssistanceConfig;
  readonly source: DataSource;
  readonly quality: QualityState;
  readonly motion: MotionStatus;
  readonly recommendation: AdvisoryRecommendation | null;
}

export type StateSubscriber = (state: UIState) => void;
export type Unsubscribe = () => void;

export interface PopupAdapter {
  getState(): Promise<UIState>;
  enablePage(): Promise<void>;
  disablePage(): Promise<void>;
  updateSettings(patch: Partial<AssistanceConfig>): Promise<AssistanceConfig>;
  subscribe(fn: StateSubscriber): Unsubscribe;
}

export interface OptionsAdapter {
  getState(): Promise<UIState>;
  updateSettings(patch: Partial<AssistanceConfig>): Promise<AssistanceConfig>;
  resetToDefault(): Promise<AssistanceConfig>;
  subscribe(fn: StateSubscriber): Unsubscribe;
}

export type FrameSubscriber = (frame: MotionFrame) => void;

export interface DeviceClient {
  connect(token?: string): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(fn: FrameSubscriber): Unsubscribe;
  startCalibration(phase: 'stationary' | 'intentional', requestId?: string): Promise<string>;
  finishCalibration(sessionId: string, requestId?: string): Promise<CalibrationResult>;
  exportSession(sessionId: string): Promise<Record<string, unknown>>;
}

export type AdaptiveStatusSubscriber = (status: import('./adaptiveForms.ts').AdaptiveFormStatus) => void;

export interface AdaptiveFormsAdapter {
  getStatus(): Promise<import('./adaptiveForms.ts').AdaptiveFormStatus>;
  detectForm(): Promise<{ status: import('./adaptiveForms.ts').AdaptiveFormStatus; form?: import('./adaptiveForms.ts').AdaptiveFormData }>;
  requestPlan(form: import('./adaptiveForms.ts').AdaptiveFormData): Promise<import('./adaptiveForms.ts').AdaptiveLayoutProposal>;
  applyPlan(proposal: import('./adaptiveForms.ts').AdaptiveLayoutProposal): Promise<void>;
  restoreOriginal(): Promise<void>;
  subscribeStatus(fn: AdaptiveStatusSubscriber): Unsubscribe;
}
