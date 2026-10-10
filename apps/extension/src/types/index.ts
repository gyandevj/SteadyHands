/**
 * Canonical SteadyHand Extension Types (conforming to docs/contracts.md)
 */

export type SourceState = 'live' | 'recorded' | 'synthetic' | 'unavailable';
export type QualityState = 'warming_up' | 'good' | 'degraded' | 'stale' | 'haptic_blanking' | 'unavailable';
export type MotionStatus = 'quiet' | 'periodic_motion' | 'other_motion' | 'unknown';
export type PointerMode = 'native' | 'stabilized' | 'raw_virtual';
export type TransportStatus = 'connected' | 'connecting' | 'unavailable';

export interface OneEuroConfig {
  kind: 'one_euro';
  min_cutoff_hz: number;
  beta: number;
  derivative_cutoff_hz: number;
}

export interface ExponentialConfig {
  kind: 'exponential';
  alpha: number;
}

export type FilterConfig = OneEuroConfig | ExponentialConfig;

export interface TargetConfig {
  capture_radius_px: number;
  ambiguity_margin_px: number;
}

export interface DwellConfig {
  enabled: boolean;
  duration_ms: number;
  rearm_ms: number;
}

export interface AssistanceConfig {
  v: number;
  revision: number;
  mode: PointerMode;
  filter: FilterConfig;
  target: TargetConfig;
  dwell: DwellConfig;
  haptics_enabled: boolean;
  show_raw_pointer: boolean;
}

export const DEFAULT_ASSISTANCE_CONFIG: AssistanceConfig = {
  v: 1,
  revision: 1,
  mode: 'stabilized',
  filter: {
    kind: 'one_euro',
    min_cutoff_hz: 1.0,
    beta: 0.002,
    derivative_cutoff_hz: 1.0
  },
  target: {
    capture_radius_px: 16,
    ambiguity_margin_px: 8
  },
  dwell: {
    enabled: true,
    duration_ms: 800,
    rearm_ms: 300
  },
  haptics_enabled: false,
  show_raw_pointer: false
};

// Numerical interfaces (docs/contracts.md Section 4)
export type Point = { x: number; y: number; tMs: number };
export type Rect = { x: number; y: number; width: number; height: number };

export type TargetKind = 'focus' | 'toggle' | 'button';

export interface Target {
  id: string;
  rect: Rect;
  kind: TargetKind;
  enabled: boolean;
  dwellAllowed: boolean;
}

export interface EngineInput {
  raw: Point;
  targets: readonly Target[];
  geometryRevision: number;
  configRevision: number;
}

export interface SelectionEvent {
  id: string;
  targetId: string;
}

export interface EngineOutput {
  pointer: Point;
  candidateId: string | null;
  ambiguous: boolean;
  dwellProgress: number;
  selection: SelectionEvent | null;
}

export interface InteractionEngine {
  step(input: EngineInput): EngineOutput;
  cancel(reason: string): void;
  reset(point: Point): void;
  applyConfig(config: AssistanceConfig): void;
}

// Extension message contracts (docs/contracts.md Section 3)
export interface BaseMessage {
  v: number;
  request_id: string;
  type: string;
}

export interface MessageResponse<T = unknown> {
  v: number;
  request_id: string;
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PageEnableMessage extends BaseMessage {
  type: 'page.enable';
}

export interface PageDisableMessage extends BaseMessage {
  type: 'page.disable';
}

export interface SettingsGetMessage extends BaseMessage {
  type: 'settings.get';
}

export interface SettingsUpdateMessage extends BaseMessage {
  type: 'settings.update';
  patch: Partial<AssistanceConfig>;
  expectedRevision?: number;
}

export interface ContentReadyMessage extends BaseMessage {
  type: 'content.ready';
  instanceId: string;
}

export interface ContentStatusMessage extends BaseMessage {
  type: 'content.status';
  enabled: boolean;
  targetCount: number;
  unsupportedReason: string | null;
}

export interface SettingsAppliedMessage extends BaseMessage {
  type: 'settings.applied';
  config: AssistanceConfig;
}

export interface DeviceStateMessage extends BaseMessage {
  type: 'device.state';
  source: SourceState;
  health: string;
  quality: QualityState;
  motion: {
    status: MotionStatus;
    dominant_hz: number | null;
    band_rms_g: number | null;
  } | null;
  recommendation: {
    id: string;
    preset: string;
    requires_user_acceptance: boolean;
  } | null;
}

export interface SelectionConfirmedMessage extends BaseMessage {
  type: 'selection.confirmed';
  id: string;
  targetId: string;
  kind: TargetKind;
  tMs: number;
}

export interface TransportStateMessage extends BaseMessage {
  type: 'transport.state';
  status: TransportStatus;
}

export interface DeviceStatusQueryMessage extends BaseMessage {
  type: 'device.status';
}

export type ExtensionMessage =
  | PageEnableMessage
  | PageDisableMessage
  | SettingsGetMessage
  | SettingsUpdateMessage
  | ContentReadyMessage
  | ContentStatusMessage
  | SettingsAppliedMessage
  | DeviceStateMessage
  | SelectionConfirmedMessage
  | TransportStateMessage
  | DeviceStatusQueryMessage;

// UI Adapter interfaces for Kripa
export interface ExtensionUIState {
  isPageSupported: boolean;
  isPageEnabled: boolean;
  activeUrl: string;
  config: AssistanceConfig;
  transportStatus: TransportStatus;
  deviceSource: SourceState;
  deviceQuality: QualityState;
  deviceMotion: MotionStatus;
  recommendation: { id: string; preset: string } | null;
}

export interface PopupAdapter {
  getState(): Promise<ExtensionUIState>;
  enablePage(): Promise<boolean>;
  disablePage(): Promise<boolean>;
  updateSettings(patch: Partial<AssistanceConfig>): Promise<AssistanceConfig>;
  openOptions(): void;
  subscribe(listener: (state: ExtensionUIState) => void): () => void;
}

export interface OptionsAdapter {
  getConfig(): Promise<AssistanceConfig>;
  updateConfig(patch: Partial<AssistanceConfig>): Promise<AssistanceConfig>;
  resetConfig(): Promise<AssistanceConfig>;
  getTransportState(): Promise<{ status: TransportStatus; endpoint: string; hasToken: boolean }>;
  setConnection(endpoint: string, token: string): Promise<void>;
  subscribe(listener: (config: AssistanceConfig) => void): () => void;
}
