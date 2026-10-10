import { AssistanceConfig, DEFAULT_ASSISTANCE_CONFIG } from '../types/index.js';

const STORAGE_KEY_CONFIG = 'steadyhand_config';
const STORAGE_KEY_CONNECTION = 'steadyhand_connection';

export interface ConnectionSettings {
  endpoint: string;
  token: string;
}

const DEFAULT_CONNECTION: ConnectionSettings = {
  endpoint: 'ws://127.0.0.1:8765/v1/stream',
  token: ''
};

export class SettingsStore {
  private cachedConfig: AssistanceConfig | null = null;
  private cachedConnection: ConnectionSettings | null = null;

  async getConfig(): Promise<AssistanceConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    try {
      const result = await chrome.storage.local.get(STORAGE_KEY_CONFIG);
      if (result[STORAGE_KEY_CONFIG]) {
        this.cachedConfig = result[STORAGE_KEY_CONFIG] as AssistanceConfig;
      } else {
        this.cachedConfig = { ...DEFAULT_ASSISTANCE_CONFIG };
        await chrome.storage.local.set({ [STORAGE_KEY_CONFIG]: this.cachedConfig });
      }
    } catch {
      this.cachedConfig = { ...DEFAULT_ASSISTANCE_CONFIG };
    }

    return this.cachedConfig;
  }

  async updateConfig(patch: Partial<AssistanceConfig>): Promise<AssistanceConfig> {
    const current = await this.getConfig();
    const updated: AssistanceConfig = {
      ...current,
      ...patch,
      revision: current.revision + 1,
      v: 1
    };

    // Deep merge filter and targets if partial
    if (patch.filter) {
      updated.filter = { ...current.filter, ...patch.filter } as any;
    }
    if (patch.target) {
      updated.target = { ...current.target, ...patch.target };
    }
    if (patch.dwell) {
      updated.dwell = { ...current.dwell, ...patch.dwell };
    }

    this.cachedConfig = updated;
    await chrome.storage.local.set({ [STORAGE_KEY_CONFIG]: updated });
    return updated;
  }

  async resetConfig(): Promise<AssistanceConfig> {
    const current = await this.getConfig();
    const reset: AssistanceConfig = {
      ...DEFAULT_ASSISTANCE_CONFIG,
      revision: current.revision + 1
    };
    this.cachedConfig = reset;
    await chrome.storage.local.set({ [STORAGE_KEY_CONFIG]: reset });
    return reset;
  }

  async getConnection(): Promise<ConnectionSettings> {
    if (this.cachedConnection) {
      return this.cachedConnection;
    }
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY_CONNECTION);
      if (result[STORAGE_KEY_CONNECTION]) {
        this.cachedConnection = result[STORAGE_KEY_CONNECTION] as ConnectionSettings;
      } else {
        this.cachedConnection = { ...DEFAULT_CONNECTION };
      }
    } catch {
      this.cachedConnection = { ...DEFAULT_CONNECTION };
    }
    return this.cachedConnection;
  }

  async setConnection(endpoint: string, token: string): Promise<void> {
    const cleanEndpoint = endpoint.trim() || DEFAULT_CONNECTION.endpoint;
    const cleanToken = token.trim();
    this.cachedConnection = { endpoint: cleanEndpoint, token: cleanToken };
    await chrome.storage.local.set({ [STORAGE_KEY_CONNECTION]: this.cachedConnection });
  }
}

export const settingsStore = new SettingsStore();
