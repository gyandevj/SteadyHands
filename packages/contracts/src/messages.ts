/**
 * Message envelopes, browser IPC messages, and WebSocket frames.
 * Conforms to docs/contracts.md (Version 1).
 */

import type { AssistanceConfig } from './settings.ts';
import type { DataSource, QualityState, MotionStatus, AdvisoryRecommendation, MotionFrame, DeviceHello, DeviceHealth } from './device.ts';
import type {
  AdaptiveFormData,
  AdaptiveLayoutProposal,
  AdaptiveFormStatus,
} from './adaptiveForms.ts';

export interface Envelope<T = unknown> {
  readonly v: 1;
  readonly type: string;
  readonly request_id: string;
  readonly payload?: T;
}

export interface SuccessResponse<T = unknown> {
  readonly v: 1;
  readonly request_id: string;
  readonly ok: true;
  readonly data: T;
}

export interface ErrorResponse {
  readonly v: 1;
  readonly request_id: string;
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export type ResponseEnvelope<T = unknown> = SuccessResponse<T> | ErrorResponse;

// Browser internal messages
export interface PageEnableMessage {
  readonly v: 1;
  readonly type: 'page.enable';
  readonly request_id: string;
}

export interface PageDisableMessage {
  readonly v: 1;
  readonly type: 'page.disable';
  readonly request_id: string;
}

export interface SettingsGetMessage {
  readonly v: 1;
  readonly type: 'settings.get';
  readonly request_id: string;
}

export interface SettingsUpdateMessage {
  readonly v: 1;
  readonly type: 'settings.update';
  readonly request_id: string;
  readonly expected_revision: number;
  readonly patch: Partial<AssistanceConfig>;
}

export interface ContentReadyMessage {
  readonly v: 1;
  readonly type: 'content.ready';
  readonly request_id: string;
  readonly instance_id: string;
}

export interface ContentStatusMessage {
  readonly v: 1;
  readonly type: 'content.status';
  readonly request_id: string;
  readonly enabled: boolean;
  readonly target_count: number;
  readonly unsupported_reason: string | null;
}

export interface SettingsAppliedMessage {
  readonly v: 1;
  readonly type: 'settings.applied';
  readonly request_id: string;
  readonly config: AssistanceConfig;
  readonly revision: number;
}

export interface DeviceStateMessage {
  readonly v: 1;
  readonly type: 'device.state';
  readonly request_id: string;
  readonly source: DataSource;
  readonly quality: QualityState;
  readonly motion: MotionStatus;
  readonly recommendation: AdvisoryRecommendation | null;
}

export interface SelectionConfirmedMessage {
  readonly v: 1;
  readonly type: 'selection.confirmed';
  readonly request_id: string;
  readonly selection_id: string;
  readonly kind: 'focus' | 'toggle' | 'button';
  readonly dwell_ms: number;
}

export interface TransportStateMessage {
  readonly v: 1;
  readonly type: 'transport.state';
  readonly request_id: string;
  readonly status: 'connected' | 'connecting' | 'unavailable';
  readonly source: DataSource;
}

// Adaptive Forms browser messages
export interface AdaptiveDetectRequestMessage {
  readonly v: 1;
  readonly type: 'adaptive.detect.request';
  readonly request_id: string;
}

export interface AdaptiveDetectResponseMessage {
  readonly v: 1;
  readonly type: 'adaptive.detect.response';
  readonly request_id: string;
  readonly status: AdaptiveFormStatus;
  readonly form?: AdaptiveFormData;
}

export interface AdaptivePlanRequestMessage {
  readonly v: 1;
  readonly type: 'adaptive.plan.request';
  readonly request_id: string;
  readonly form: AdaptiveFormData;
}

export interface AdaptivePlanResponseMessage {
  readonly v: 1;
  readonly type: 'adaptive.plan.response';
  readonly request_id: string;
  readonly ok: boolean;
  readonly proposal?: AdaptiveLayoutProposal;
  readonly error?: string;
}

export interface AdaptiveApplyRequestMessage {
  readonly v: 1;
  readonly type: 'adaptive.apply.request';
  readonly request_id: string;
  readonly proposal: AdaptiveLayoutProposal;
}

export interface AdaptiveApplyResponseMessage {
  readonly v: 1;
  readonly type: 'adaptive.apply.response';
  readonly request_id: string;
  readonly ok: boolean;
  readonly error?: string;
}

export interface AdaptiveRestoreRequestMessage {
  readonly v: 1;
  readonly type: 'adaptive.restore.request';
  readonly request_id: string;
}

export interface AdaptiveRestoreResponseMessage {
  readonly v: 1;
  readonly type: 'adaptive.restore.response';
  readonly request_id: string;
  readonly ok: boolean;
  readonly error?: string;
}

export interface AdaptiveStatusBroadcastMessage {
  readonly v: 1;
  readonly type: 'adaptive.status';
  readonly request_id: string;
  readonly status: AdaptiveFormStatus;
}

// WebSocket wire protocol messages
export interface ClientAuthMessage {
  readonly v: 1;
  readonly type: 'client.auth';
  readonly request_id: string;
  readonly token: string;
  readonly role?: 'extension' | 'dashboard';
}

export interface ClientPingMessage {
  readonly v: 1;
  readonly type: 'client.ping';
  readonly request_id: string;
  readonly timestamp_ms: number;
}

export interface ServerPongMessage {
  readonly v: 1;
  readonly type: 'server.pong';
  readonly request_id: string;
  readonly timestamp_ms: number;
}

export interface StateSnapshotMessage {
  readonly v: 1;
  readonly type: 'state.snapshot';
  readonly request_id: string;
  readonly device: DeviceHello | null;
  readonly health: DeviceHealth;
  readonly latest_frame: MotionFrame | null;
}

export interface CommandErrorMessage {
  readonly v: 1;
  readonly type: 'command.error';
  readonly request_id: string;
  readonly code: string;
  readonly message: string;
}

// Session task events (Section 8)
export type SessionTaskEventKind =
  | 'task.started'
  | 'task.completed'
  | 'task.timeout'
  | 'selection.dispatched'
  | 'selection.corrected';

export interface SessionTaskEvent {
  readonly event_id: string;
  readonly task_id: string;
  readonly t_monotonic_ms: number;
  readonly config_revision: number;
  readonly source: DataSource;
  readonly kind: SessionTaskEventKind;
  readonly details?: Record<string, unknown>;
}
