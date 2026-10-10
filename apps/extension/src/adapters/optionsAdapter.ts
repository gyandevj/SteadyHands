import {
  OptionsAdapter,
  AssistanceConfig,
  TransportStatus,
  DEFAULT_ASSISTANCE_CONFIG
} from '../types/index.js';

export class ChromeOptionsAdapter implements OptionsAdapter {
  private listeners = new Set<(config: AssistanceConfig) => void>();
  private currentConfig: AssistanceConfig = { ...DEFAULT_ASSISTANCE_CONFIG };

  async getConfig(): Promise<AssistanceConfig> {
    try {
      const resp = await chrome.runtime.sendMessage({
        v: 1,
        type: 'settings.get',
        request_id: `opt-get-${Date.now()}`
      });
      if (resp?.ok && resp.data) {
        this.currentConfig = resp.data;
      }
    } catch {
      // Fallback
    }
    return this.currentConfig;
  }

  async updateConfig(patch: Partial<AssistanceConfig>): Promise<AssistanceConfig> {
    const resp = await chrome.runtime.sendMessage({
      v: 1,
      type: 'settings.update',
      request_id: `opt-up-${Date.now()}`,
      patch
    });
    if (resp?.ok && resp.data) {
      this.currentConfig = resp.data;
      this.notify();
      return resp.data;
    }
    return this.currentConfig;
  }

  async resetConfig(): Promise<AssistanceConfig> {
    const resp = await chrome.runtime.sendMessage({
      v: 1,
      type: 'settings.update',
      request_id: `opt-reset-${Date.now()}`,
      patch: { ...DEFAULT_ASSISTANCE_CONFIG }
    });
    if (resp?.ok && resp.data) {
      this.currentConfig = resp.data;
      this.notify();
      return resp.data;
    }
    return this.currentConfig;
  }

  async getTransportState(): Promise<{ status: TransportStatus; endpoint: string; hasToken: boolean }> {
    try {
      const storage = await chrome.storage.local.get('steadyhand_connection');
      const conn = storage['steadyhand_connection'] || {};
      return {
        status: 'unavailable',
        endpoint: conn.endpoint || 'ws://127.0.0.1:8765/v1/stream',
        hasToken: !!conn.token
      };
    } catch {
      return {
        status: 'unavailable',
        endpoint: 'ws://127.0.0.1:8765/v1/stream',
        hasToken: false
      };
    }
  }

  async setConnection(endpoint: string, token: string): Promise<void> {
    await chrome.storage.local.set({
      steadyhand_connection: {
        endpoint: endpoint.trim(),
        token: token.trim()
      }
    });
  }

  subscribe(listener: (config: AssistanceConfig) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentConfig);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentConfig);
    }
  }
}

export const optionsAdapter = new ChromeOptionsAdapter();
