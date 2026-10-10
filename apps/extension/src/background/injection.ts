import { tabSessionManager } from './tabSessions.js';

export async function injectContentScript(tabId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const tab = await chrome.tabs.get(tabId);
    const { supported, reason } = tabSessionManager.isUrlSupported(tab.url);
    if (!supported) {
      tabSessionManager.setTabState(tabId, {
        url: tab.url || '',
        isSupported: false,
        unsupportedReason: reason
      });
      return { success: false, error: reason };
    }

    // Execute content script in the top frame only
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ['content.js']
    });

    tabSessionManager.setTabState(tabId, {
      url: tab.url || '',
      isSupported: true,
      injected: true,
      enabled: true
    });

    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to inject content script.';
    return { success: false, error: errorMsg };
  }
}
