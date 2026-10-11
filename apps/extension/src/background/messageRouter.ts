import {
  ExtensionMessage,
  MessageResponse
} from '../types/index.js';
import { settingsStore } from './settingsStore.js';
import { tabSessionManager } from './tabSessions.js';
import { injectContentScript } from './injection.js';
import { deviceTransport } from './deviceTransport.js';
import { adaptiveFormsClient } from './adaptiveFormsClient.js';
import { adaptiveSettingsStore } from './adaptiveSettings.js';

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

    case 'adaptive.detect.request': {
      const activeTab = await tabSessionManager.getActiveTab();
      if (!activeTab || activeTab.id === undefined) {
        return { v, request_id: requestId, ok: false, error: 'No active webpage found.' };
      }
      const tabId = activeTab.id;
      const { supported, reason } = tabSessionManager.isUrlSupported(activeTab.url);
      if (!supported) {
        return { v, request_id: requestId, ok: false, error: reason };
      }

      try {
        let response = await chrome.tabs.sendMessage(tabId, {
          v: 1,
          type: 'adaptive.detect.request',
          request_id: requestId,
        });
        if (!response) {
          await injectContentScript(tabId);
          response = await chrome.tabs.sendMessage(tabId, {
            v: 1,
            type: 'adaptive.detect.request',
            request_id: requestId,
          });
        }
        tabSessionManager.setTabState(tabId, { enabled: true, injected: true });
        return { v, request_id: requestId, ok: true, data: response };
      } catch {
        try {
          await injectContentScript(tabId);
          const response = await chrome.tabs.sendMessage(tabId, {
            v: 1,
            type: 'adaptive.detect.request',
            request_id: requestId,
          });
          tabSessionManager.setTabState(tabId, { enabled: true, injected: true });
          return { v, request_id: requestId, ok: true, data: response };
        } catch (retryErr: any) {
          return { v, request_id: requestId, ok: false, error: retryErr?.message || 'Failed to detect forms in active tab' };
        }
      }
    }

    case 'adaptive.plan.request': {
      const form = (message as any).form;
      if (!form) {
        return { v, request_id: requestId, ok: false, error: 'Missing form data for planning' };
      }
      try {
        const proposal = await adaptiveFormsClient.requestPlan({
          v: 1,
          requestId,
          form,
        });
        return { v, request_id: requestId, ok: true, data: proposal };
      } catch (e: any) {
        return { v, request_id: requestId, ok: false, error: e?.message || 'Gemini planning request failed' };
      }
    }

    case 'adaptive.apply.request': {
      const activeTab = await tabSessionManager.getActiveTab();
      if (!activeTab || activeTab.id === undefined) {
        return { v, request_id: requestId, ok: false, error: 'No active webpage found.' };
      }
      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, {
          v: 1,
          type: 'adaptive.apply.request',
          request_id: requestId,
          proposal: (message as any).proposal,
        });
        return { v, request_id: requestId, ok: true, data: response };
      } catch (e: any) {
        return { v, request_id: requestId, ok: false, error: e?.message || 'Failed to apply adaptive layout' };
      }
    }

    case 'adaptive.restore.request': {
      const activeTab = await tabSessionManager.getActiveTab();
      if (!activeTab || activeTab.id === undefined) {
        return { v, request_id: requestId, ok: false, error: 'No active webpage found.' };
      }
      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, {
          v: 1,
          type: 'adaptive.restore.request',
          request_id: requestId,
        });
        return { v, request_id: requestId, ok: true, data: response };
      } catch (e: any) {
        return { v, request_id: requestId, ok: false, error: e?.message || 'Failed to restore original form' };
      }
    }

    case 'adaptive.config.get': {
      const cfg = await adaptiveSettingsStore.getConfig();
      return { v, request_id: requestId, ok: true, data: cfg };
    }

    case 'adaptive.config.update': {
      const patch = (message as any).patch || {};
      const updated = await adaptiveSettingsStore.updateConfig(patch);
      if (updated.pairingToken) {
        adaptiveFormsClient.setToken(updated.pairingToken);
      }
      if (updated.endpoint) {
        adaptiveFormsClient.setEndpoint(updated.endpoint);
      }
      return { v, request_id: requestId, ok: true, data: updated };
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
