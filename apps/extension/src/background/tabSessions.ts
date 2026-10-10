export interface TabState {
  tabId: number;
  url: string;
  isSupported: boolean;
  unsupportedReason?: string;
  injected: boolean;
  enabled: boolean;
  instanceId?: string;
}

export class TabSessionManager {
  private tabs = new Map<number, TabState>();

  isUrlSupported(url?: string): { supported: boolean; reason?: string } {
    if (!url) {
      return { supported: false, reason: 'No active webpage URL detected.' };
    }
    const lower = url.toLowerCase();
    if (lower.startsWith('chrome://') || lower.startsWith('chrome-extension://')) {
      return { supported: false, reason: 'Chrome internal pages cannot be accessed by extensions.' };
    }
    if (lower.startsWith('devtools://') || lower.startsWith('view-source:')) {
      return { supported: false, reason: 'Developer tools and source views are unsupported.' };
    }
    if (lower.startsWith('chrome.google.com/webstore') || lower.startsWith('chromewebstore.google.com')) {
      return { supported: false, reason: 'Chrome Web Store prohibits content scripts for security.' };
    }
    if (!lower.startsWith('http://') && !lower.startsWith('https://') && !lower.startsWith('file://')) {
      return { supported: false, reason: 'Only HTTP, HTTPS, and local FILE pages are supported.' };
    }
    return { supported: true };
  }

  async getActiveTab(): Promise<chrome.tabs.Tab | null> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  getTabState(tabId: number): TabState | undefined {
    return this.tabs.get(tabId);
  }

  setTabState(tabId: number, state: Partial<TabState>): TabState {
    const existing = this.tabs.get(tabId) || {
      tabId,
      url: '',
      isSupported: false,
      injected: false,
      enabled: false
    };
    const updated = { ...existing, ...state };
    this.tabs.set(tabId, updated);
    return updated;
  }

  removeTab(tabId: number): void {
    this.tabs.delete(tabId);
  }
}

export const tabSessionManager = new TabSessionManager();
