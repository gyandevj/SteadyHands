import {
  TransportStatus,
  SourceState,
  QualityState,
  MotionStatus
} from '../types/index.js';
import { settingsStore } from './settingsStore.js';

export interface DeviceStateSnapshot {
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

export class DeviceTransport {
  private ws: WebSocket | null = null;
  private status: TransportStatus = 'unavailable';
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private backoffDelayMs = 1000;
  private maxBackoffDelayMs = 30000;
  private currentSnapshot: DeviceStateSnapshot = {
    source: 'unavailable',
    health: 'disconnected',
    quality: 'unavailable',
    motion: null,
    recommendation: null
  };

  private listeners = new Set<(status: TransportStatus, snapshot: DeviceStateSnapshot) => void>();

  getStatus(): TransportStatus {
    return this.status;
  }

  getSnapshot(): DeviceStateSnapshot {
    return this.currentSnapshot;
  }

  subscribe(listener: (status: TransportStatus, snapshot: DeviceStateSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.status, this.currentSnapshot);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.status, this.currentSnapshot);
    }
  }

  async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const { endpoint, token } = await settingsStore.getConnection();
    this.status = 'connecting';
    this.notify();

    try {
      this.ws = new WebSocket(endpoint);

      this.ws.onopen = () => {
        // Reset backoff on open
        this.backoffDelayMs = 1000;
        this.status = 'connected';

        // Send first-frame authentication within 3 seconds
        const authPayload = JSON.stringify({
          v: 1,
          type: 'client.auth',
          request_id: `auth-${Date.now()}`,
          token: token || 'steadyhand-dev-token-secret'
        });
        this.ws?.send(authPayload);

        this.startKeepalive();
        this.notify();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch {
          // Ignore malformed message without crashing
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = () => {
        // WebSocket error triggers onclose
      };
    } catch {
      this.handleDisconnect();
    }
  }

  private handleServerMessage(msg: any): void {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'state.snapshot' || msg.type === 'motion.frame' || msg.type === 'device.state') {
      this.currentSnapshot = {
        source: msg.source || this.currentSnapshot.source || 'synthetic',
        health: msg.health || 'good',
        quality: msg.quality?.state || msg.quality || 'good',
        motion: msg.motion ? {
          status: msg.motion.status || 'quiet',
          dominant_hz: msg.motion.dominant_hz ?? null,
          band_rms_g: msg.motion.band_rms_g ?? null
        } : null,
        recommendation: msg.recommendation ? {
          id: msg.recommendation.id || 'rec-1',
          preset: msg.recommendation.preset || 'steady',
          requires_user_acceptance: true
        } : null
      };
      this.notify();
    } else if (msg.type === 'device.health') {
      this.currentSnapshot = {
        ...this.currentSnapshot,
        source: msg.source || this.currentSnapshot.source,
        health: msg.is_stale ? 'stale' : 'good'
      };
      this.notify();
    }
  }

  private startKeepalive(): void {
    this.stopKeepalive();
    // 20-second application ping
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          v: 1,
          type: 'client.ping',
          request_id: `ping-${Date.now()}`
        }));
      }
    }, 20000) as unknown as number;
  }

  private stopKeepalive(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private handleDisconnect(): void {
    this.stopKeepalive();
    this.ws = null;
    this.status = 'unavailable';
    this.currentSnapshot = {
      ...this.currentSnapshot,
      source: 'unavailable',
      health: 'disconnected',
      quality: 'unavailable'
    };
    this.notify();
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.backoffDelayMs = Math.min(this.backoffDelayMs * 2, this.maxBackoffDelayMs);
      this.connect();
    }, this.backoffDelayMs) as unknown as number;
  }

  sendHapticRequest(commandId: string, durationMs = 40): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        v: 1,
        type: 'haptic.request',
        command_id: commandId,
        duration_ms: Math.min(Math.max(durationMs, 1), 80),
        reason: 'selection_confirmed'
      }));
      return true;
    }
    return false;
  }

  disconnect(): void {
    this.stopKeepalive();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'unavailable';
    this.notify();
  }
}

export const deviceTransport = new DeviceTransport();
