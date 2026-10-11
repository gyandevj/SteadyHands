/**
 * Plain DOM Adaptive Forms controls for Extension Popup.
 * Follows Kripa's plain DOM UI conventions without framework overhead.
 */

import type { AdaptiveFormStatus, AdaptiveLayoutProposal } from '../types/index.ts';

export function createAdaptiveControls(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'steadyhand-card';
  container.style.cssText = `
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px;
    margin-top: 12px;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';

  const title = document.createElement('div');
  title.style.cssText = 'font-weight: 700; font-size: 0.95rem; color: #0f172a; display: flex; align-items: center; gap: 6px;';
  title.innerHTML = '✨ <span>Adapt Form with Gemini</span>';

  const badge = document.createElement('span');
  badge.id = 'adaptive-status-badge';
  badge.textContent = 'Checking...';
  badge.style.cssText = `
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 12px;
    background: #f1f5f9;
    color: #475569;
    font-weight: 600;
  `;

  header.appendChild(title);
  header.appendChild(badge);
  container.appendChild(header);

  // Description
  const desc = document.createElement('div');
  desc.style.cssText = 'font-size: 0.8rem; color: #64748b; margin-bottom: 12px; line-height: 1.4;';
  desc.textContent = 'Restructures dense forms into single-column layout with enlarged targets. Preserves all original values, validation, and submission.';
  container.appendChild(desc);

  // Status message
  const statusMsg = document.createElement('div');
  statusMsg.id = 'adaptive-status-msg';
  statusMsg.style.cssText = 'font-size: 0.82rem; color: #334155; margin-bottom: 12px; min-height: 18px;';
  container.appendChild(statusMsg);

  // Actions row
  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; gap: 8px;';

  const adaptBtn = document.createElement('button');
  adaptBtn.id = 'btn-adapt-form';
  adaptBtn.textContent = 'Adapt Form';
  adaptBtn.style.cssText = `
    flex: 1;
    padding: 8px 12px;
    background: #2563eb;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s ease;
  `;

  const restoreBtn = document.createElement('button');
  restoreBtn.id = 'btn-restore-form';
  restoreBtn.textContent = 'Restore Original';
  restoreBtn.style.cssText = `
    padding: 8px 12px;
    background: #e2e8f0;
    color: #475569;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    display: none;
  `;

  actions.appendChild(adaptBtn);
  actions.appendChild(restoreBtn);
  container.appendChild(actions);

  // Privacy notice
  const privacy = document.createElement('div');
  privacy.style.cssText = 'font-size: 0.72rem; color: #94a3b8; margin-top: 10px; text-align: center;';
  privacy.textContent = '🔒 Privacy Guaranteed: Transmits aliases only; zero entered values or personal data sent.';
  container.appendChild(privacy);

  // Logic wiring
  async function refreshFormStatus() {
    try {
      let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tabs || tabs.length === 0) {
        tabs = await chrome.tabs.query({ active: true });
      }
      const activeTab = tabs.find((t) => t.url && !t.url.startsWith('chrome-extension://')) || tabs[0];
      if (!activeTab || activeTab.id === undefined) {
        badge.textContent = 'Ready';
        adaptBtn.disabled = false;
        adaptBtn.style.opacity = '1';
        return;
      }

      let resp: any;
      try {
        resp = await chrome.tabs.sendMessage(activeTab.id, {
          v: 1,
          type: 'adaptive.detect.request',
          request_id: `detect-${Date.now()}`,
        });
      } catch {
        const bgResp = await chrome.runtime.sendMessage({
          v: 1,
          type: 'adaptive.detect.request',
          request_id: `detect-${Date.now()}`,
        });
        resp = bgResp?.data;
      }

      const status: AdaptiveFormStatus | undefined = resp?.status;
      if (status) {
        if (status.state === 'detected') {
          badge.textContent = `Form Ready (${status.fieldCount} fields)`;
          badge.style.background = '#dcfce7';
          badge.style.color = '#15803d';
          statusMsg.textContent = 'Supported form detected. Ready to optimize.';
          adaptBtn.disabled = false;
          adaptBtn.style.opacity = '1';
          restoreBtn.style.display = 'none';
        } else if (status.state === 'applied') {
          badge.textContent = 'Adapted';
          badge.style.background = '#e0e7ff';
          badge.style.color = '#3730a3';
          statusMsg.textContent = 'Adaptive layout active on page.';
          adaptBtn.disabled = true;
          adaptBtn.style.opacity = '0.6';
          restoreBtn.style.display = 'block';
        } else {
          badge.textContent = 'Ready';
          badge.style.background = '#e0f2fe';
          badge.style.color = '#0369a1';
          statusMsg.textContent = status.reason || 'Ready to adapt form on this page.';
          adaptBtn.disabled = false;
          adaptBtn.style.opacity = '1';
          restoreBtn.style.display = 'none';
        }
      } else {
        badge.textContent = 'Ready';
        badge.style.background = '#e0f2fe';
        badge.style.color = '#0369a1';
        statusMsg.textContent = 'Click Adapt Form to optimize this webpage.';
        adaptBtn.disabled = false;
        adaptBtn.style.opacity = '1';
        restoreBtn.style.display = 'none';
      }
    } catch {
      badge.textContent = 'Ready';
      adaptBtn.disabled = false;
      adaptBtn.style.opacity = '1';
    }
  }

  adaptBtn.addEventListener('click', async () => {
    adaptBtn.disabled = true;
    adaptBtn.textContent = 'Analyzing...';
    statusMsg.textContent = 'Detecting form and generating layout...';
    statusMsg.style.color = '#334155';

    try {
      let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tabs || tabs.length === 0) {
        tabs = await chrome.tabs.query({ active: true });
      }
      const activeTab = tabs.find((t) => t.url && !t.url.startsWith('chrome-extension://')) || tabs[0];
      if (!activeTab || activeTab.id === undefined) {
        throw new Error('No active webpage detected');
      }

      const tabId = activeTab.id;

      // Ensure content script is running
      try {
        await chrome.scripting.executeScript({
          target: { tabId, allFrames: false },
          files: ['content.js'],
        });
      } catch {
        // Continue if already injected
      }

      // 1. Detect and extract form directly from tab
      let detectResp: any;
      try {
        detectResp = await chrome.tabs.sendMessage(tabId, {
          v: 1,
          type: 'adaptive.detect.request',
          request_id: `detect-${Date.now()}`,
        });
      } catch {
        const bgResp = await chrome.runtime.sendMessage({
          v: 1,
          type: 'adaptive.detect.request',
          request_id: `detect-${Date.now()}`,
        });
        detectResp = bgResp?.data;
      }

      const form = detectResp?.form || detectResp?.data?.form;
      if (!form) {
        const reason =
          detectResp?.status?.reason ||
          detectResp?.error ||
          'No supported HTML form detected on this page.';
        throw new Error(reason);
      }

      // 2. Request plan (via bridge or instant demo heuristic)
      statusMsg.textContent = 'Generating accessible layout proposal...';
      const planResp = await chrome.runtime.sendMessage({
        v: 1,
        type: 'adaptive.plan.request',
        request_id: `plan-${Date.now()}`,
        form,
      });

      if (!planResp?.ok || !planResp.data) {
        throw new Error(planResp?.error || 'Layout planning failed');
      }

      const proposal: AdaptiveLayoutProposal = planResp.data;

      // 3. Show preview in page
      statusMsg.textContent = 'Preview displayed on page. Confirm to apply.';
      await chrome.tabs.sendMessage(tabId, {
        v: 1,
        type: 'adaptive.preview.request',
        request_id: `prev-${Date.now()}`,
        proposal,
      });

      adaptBtn.textContent = 'Preview Open';
      adaptBtn.disabled = false;
    } catch (e: any) {
      statusMsg.textContent = `Error: ${e.message}`;
      statusMsg.style.color = '#ef4444';
      adaptBtn.disabled = false;
      adaptBtn.style.opacity = '1';
      adaptBtn.textContent = 'Adapt Form';
    }
  });

  restoreBtn.addEventListener('click', async () => {
    restoreBtn.disabled = true;
    restoreBtn.textContent = 'Restoring...';
    try {
      await chrome.runtime.sendMessage({
        v: 1,
        type: 'adaptive.restore.request',
        request_id: `rest-${Date.now()}`,
      });
      restoreBtn.style.display = 'none';
      adaptBtn.disabled = false;
      adaptBtn.style.opacity = '1';
      adaptBtn.textContent = 'Adapt Form';
      refreshFormStatus();
    } catch (e: any) {
      statusMsg.textContent = `Restore failed: ${e.message}`;
      restoreBtn.disabled = false;
      restoreBtn.textContent = 'Restore Original';
    }
  });

  // Listen for preview action broadcasts
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'adaptive.preview.action') {
      if (msg.action === 'apply') {
        refreshFormStatus();
      } else {
        adaptBtn.disabled = false;
        adaptBtn.textContent = 'Adapt Form';
        statusMsg.textContent = 'Adaptation cancelled. Original form preserved.';
      }
    }
  });

  // Initial poll
  setTimeout(refreshFormStatus, 150);

  return container;
}
