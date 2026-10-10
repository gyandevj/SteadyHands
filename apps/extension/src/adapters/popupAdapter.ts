import {
  PopupAdapter,
  ExtensionUIState,
  AssistanceConfig,
  DEFAULT_ASSISTANCE_CONFIG
} from '../types/index.js';

export class ChromePopupAdapter implements PopupAdapter {
  private listeners = new Set<(state: ExtensionUIState) => void>();
  private currentState: ExtensionUIState = {
    isPageSupported: true,
    isPageEnabled: false,
    activeUrl: '',
    config: { ...DEFAULT_ASSISTANCE_CONFIG },
    transportStatus: 'unavailable',
    deviceSource: 'unavailable',
    deviceQuality: 'unavailable',
    deviceMotion: 'unknown',
    recommendation: null
  };

  async getState(): Promise<ExtensionUIState> {
    try {
      // 1. Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url || '';
      this.currentState.activeUrl = url;

      // Check supported url
      const isInternal =
        url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('devtools://') ||
        url.includes('chrome.google.com/webstore');

      this.currentState.isPageSupported = !isInternal && (url.startsWith('http') || url.startsWith('file:'));

      // 2. Fetch latest config from worker
      const resp = await chrome.runtime.sendMessage({
        v: 1,
        type: 'settings.get',
        request_id: `get-${Date.now()}`
      });

      if (resp?.ok && resp.data) {
        this.currentState.config = resp.data;
      }

      // 3. Fetch device status from worker
      try {
        const devResp = await chrome.runtime.sendMessage({
          v: 1,
          type: 'device.status',
          request_id: `dev-${Date.now()}`
        });
        if (devResp?.ok && devResp.data) {
          this.currentState.transportStatus = devResp.data.transportStatus;
          if (devResp.data.deviceState) {
            this.currentState.deviceSource = devResp.data.deviceState.source;
            this.currentState.deviceQuality = devResp.data.deviceState.quality;
            this.currentState.deviceMotion = devResp.data.deviceState.motion?.status || 'quiet';
            this.currentState.recommendation = devResp.data.deviceState.recommendation;
          }
        }
      } catch {
        // Fallback state
      }

      // Check if page enabled via script ping or state
      if (tab?.id !== undefined && this.currentState.isPageSupported) {
        try {
          const statusResp = await chrome.tabs.sendMessage(tab.id, {
            v: 1,
            type: 'page.status',
            request_id: `stat-${Date.now()}`
          });
          this.currentState.isPageEnabled = !!statusResp?.enabled;
        } catch {
          // If message fails, content script is not yet running
          this.currentState.isPageEnabled = false;
        }
      }
    } catch {
      // Fallback state
    }

    return this.currentState;
  }

  async enablePage(): Promise<boolean> {
    const resp = await chrome.runtime.sendMessage({
      v: 1,
      type: 'page.enable',
      request_id: `enable-${Date.now()}`
    });
    if (resp?.ok) {
      this.currentState.isPageEnabled = true;
      this.notify();
      return true;
    }
    return false;
  }

  async disablePage(): Promise<boolean> {
    const resp = await chrome.runtime.sendMessage({
      v: 1,
      type: 'page.disable',
      request_id: `disable-${Date.now()}`
    });
    if (resp?.ok) {
      this.currentState.isPageEnabled = false;
      this.notify();
      return true;
    }
    return false;
  }

  async updateSettings(patch: Partial<AssistanceConfig>): Promise<AssistanceConfig> {
    const resp = await chrome.runtime.sendMessage({
      v: 1,
      type: 'settings.update',
      request_id: `up-${Date.now()}`,
      patch
    });
    if (resp?.ok && resp.data) {
      this.currentState.config = resp.data;
      this.notify();
      return resp.data;
    }
    return this.currentState.config;
  }

  openOptions(): void {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  }

  subscribe(listener: (state: ExtensionUIState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
}

export const popupAdapter = new ChromePopupAdapter();
