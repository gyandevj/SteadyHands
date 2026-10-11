import { handleMessage } from './messageRouter.js';
import { tabSessionManager } from './tabSessions.js';
import { deviceTransport } from './deviceTransport.js';
import { adaptiveFormsClient } from './adaptiveFormsClient.js';

console.log('[SteadyHand] Background Service Worker initialized.');

// Listen for extension messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((err) => {
      sendResponse({
        v: 1,
        request_id: message?.request_id || 'err',
        ok: false,
        error: err?.message || 'Internal service worker error'
      });
    });
  // Return true to indicate asynchronous response
  return true;
});

// Clean up tab tracking when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  tabSessionManager.removeTab(tabId);
  adaptiveFormsClient.abortAll();
});

// Re-evaluate on navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    adaptiveFormsClient.abortAll();
    tabSessionManager.setTabState(tabId, {
      url: tab.url || '',
      injected: false,
      enabled: false
    });
  }
});

// Subscribe to transport updates and broadcast to active tabs
deviceTransport.subscribe((status, snapshot) => {
  chrome.tabs.query({}).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        chrome.tabs.sendMessage(tab.id, {
          v: 1,
          type: 'device.state',
          request_id: `dev-${Date.now()}`,
          source: snapshot.source,
          health: snapshot.health,
          quality: snapshot.quality,
          motion: snapshot.motion,
          recommendation: snapshot.recommendation
        }).catch(() => {});

        chrome.tabs.sendMessage(tab.id, {
          v: 1,
          type: 'transport.state',
          request_id: `trans-${Date.now()}`,
          status
        }).catch(() => {});
      }
    }
  });
});

// Attempt background transport connection
deviceTransport.connect().catch((err) => {
  console.warn('[SteadyHand] Device transport initial connection deferred:', err);
});
