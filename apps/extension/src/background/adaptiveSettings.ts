/**
 * Adaptive Forms settings store.
 * Manages configuration for bridge AI endpoint, pairing credentials, and defaults.
 */

export interface AdaptiveFormsConfig {
  endpoint: string;
  pairingToken: string;
  autoPreview: boolean;
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveFormsConfig = {
  endpoint: 'http://127.0.0.1:8765/v1/adaptive-forms/plan',
  pairingToken: 'steadyhand-adaptive-forms-dev-token',
  autoPreview: true,
};

export class AdaptiveSettingsStore {
  async getConfig(): Promise<AdaptiveFormsConfig> {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return { ...DEFAULT_ADAPTIVE_CONFIG };
    }
    const res = await chrome.storage.local.get('steadyhand_adaptive_config');
    return res.steadyhand_adaptive_config || { ...DEFAULT_ADAPTIVE_CONFIG };
  }

  async updateConfig(patch: Partial<AdaptiveFormsConfig>): Promise<AdaptiveFormsConfig> {
    const current = await this.getConfig();
    const updated = { ...current, ...patch };
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ steadyhand_adaptive_config: updated });
    }
    return updated;
  }
}

export const adaptiveSettingsStore = new AdaptiveSettingsStore();
