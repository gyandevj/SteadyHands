import {
  ExtensionMessage,
  MessageResponse
} from '../types/index.js';
import { settingsStore } from './settingsStore.js';
import { tabSessionManager } from './tabSessions.js';
import { injectContentScript } from './injection.js';
import { deviceTransport } from './deviceTransport.js';

export async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<MessageResponse<any>> {
  const v = message.v || 1;
  const requestId = message.request_id || `req-${Date.now()}`;

  switch (message.type) {
    case 'page.enable': {
      const activeTab = await tabSessionManager.getActiveTab();
      if (!activeTab || activeTab.id === undefined) {
        return { v, request_id: requestId, ok: false, error: 'No active webpage found.' };
      }

      const tabId = activeTab.id;
      const { supported, reason } = tabSessionManager.isUrlSupported(activeTab.url);
      if (!supported) {
        return { v, request_id: requestId, ok: false, error: reason };
      }

      // Check if already injected
      const state = tabSessionManager.getTabState(tabId);
      if (!state?.injected) {
        const injectionResult = await injectContentScript(tabId);
        if (!injectionResult.success) {
          return { v, request_id: requestId, ok: false, error: injectionResult.error };
        }
      } else {
        // Already injected, send re-enable message to content
        try {
          await chrome.tabs.sendMessage(tabId, {
            v: 1,
            type: 'page.enable',
            request_id: requestId
          });
        } catch {
          // If message fails, tab may have navigated; re-inject
          await injectContentScript(tabId);
        }
      }

      tabSessionManager.setTabState(tabId, { enabled: true });
      return { v, request_id: requestId, ok: true, data: { enabled: true, tabId } };
    }

    case 'page.disable': {
      const activeTab = await tabSessionManager.getActiveTab();
      if (!activeTab || activeTab.id === undefined) {
        return { v, request_id: requestId, ok: false, error: 'No active webpage found.' };
      }

      const tabId = activeTab.id;
      try {
        await chrome.tabs.sendMessage(tabId, {
          v: 1,
          type: 'page.disable',
          request_id: requestId
        });
      } catch {
        // Tab might be closed or not loaded
      }

      tabSessionManager.setTabState(tabId, { enabled: false });
      return { v, request_id: requestId, ok: true, data: { enabled: false, tabId } };
    }

    case 'settings.get': {
      const config = await settingsStore.getConfig();
      return { v, request_id: requestId, ok: true, data: config };
    }

    case 'settings.update': {
      const patch = (message as any).patch || {};
      const updatedConfig = await settingsStore.updateConfig(patch);

      // Broadcast settings.applied to all open tabs
      broadcastToTabs({
        v: 1,
        type: 'settings.applied',
        request_id: `bcast-${Date.now()}`,
        config: updatedConfig
      });

      return { v, request_id: requestId, ok: true, data: updatedConfig };
    }

    case 'content.ready': {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        tabSessionManager.setTabState(tabId, {
          injected: true,
          enabled: true,
          instanceId: (message as any).instanceId
        });
      }

      const config = await settingsStore.getConfig();
      const snapshot = deviceTransport.getSnapshot();

      return {
        v,
        request_id: requestId,
        ok: true,
        data: {
          config,
          deviceState: snapshot,
          transportStatus: deviceTransport.getStatus()
        }
      };
    }

    case 'content.status': {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        tabSessionManager.setTabState(tabId, {
          enabled: (message as any).enabled
        });
      }
      return { v, request_id: requestId, ok: true };
    }

    case 'selection.confirmed': {
      const config = await settingsStore.getConfig();
      if (config.haptics_enabled) {
        const cmdId = (message as any).id || `sel-${Date.now()}`;
        deviceTransport.sendHapticRequest(cmdId, 40);
      }
      return { v, request_id: requestId, ok: true };
    }

    case 'device.status': {
      return {
        v,
        request_id: requestId,
        ok: true,
        data: {
          transportStatus: deviceTransport.getStatus(),
          deviceState: deviceTransport.getSnapshot()
        }
      };
    }

    default:
      return { v, request_id: requestId, ok: false, error: `Unknown message type: ${message.type}` };
  }
}

async function broadcastToTabs(msg: any): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id !== undefined) {
      try {
        await chrome.tabs.sendMessage(tab.id, msg);
      } catch {
        // Tab does not have content script injected; ignore
      }
    }
  }
}
