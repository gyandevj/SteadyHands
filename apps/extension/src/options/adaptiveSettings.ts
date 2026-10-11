/**
 * Plain DOM Adaptive Forms Settings Component for Options Page.
 * Conforms to Kripa's options page structure.
 */

import { DEFAULT_ADAPTIVE_CONFIG } from '../background/adaptiveSettings.ts';

export function createAdaptiveSettingsSection(): HTMLElement {
  const section = document.createElement('div');
  section.className = 'sh-settings-section';
  section.style.cssText = `
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
  `;

  section.innerHTML = `
    <h3 style="margin: 0 0 8px 0; font-size: 1.1rem; color: #0f172a;">✨ Adaptive Forms with Gemini</h3>
    <p style="margin: 0 0 16px 0; font-size: 0.85rem; color: #64748b;">
      Configure the local FastAPI bridge and Gemini model integration settings for form restructuring.
    </p>

    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div>
        <label style="display: block; font-weight: 600; font-size: 0.85rem; color: #334155; margin-bottom: 4px;">
          Bridge AI Endpoint URL
        </label>
        <input
          type="text"
          id="sh-af-endpoint"
          value="${DEFAULT_ADAPTIVE_CONFIG.endpoint}"
          style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;"
        />
        <span style="font-size: 0.75rem; color: #94a3b8;">Default: ${DEFAULT_ADAPTIVE_CONFIG.endpoint}</span>
      </div>

      <div>
        <label style="display: block; font-weight: 600; font-size: 0.85rem; color: #334155; margin-bottom: 4px;">
          Adaptive Forms Pairing Token
        </label>
        <input
          type="password"
          id="sh-af-token"
          value="${DEFAULT_ADAPTIVE_CONFIG.pairingToken}"
          style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;"
        />
        <span style="font-size: 0.75rem; color: #94a3b8;">Optional secret token matching STEADYHAND_ADAPTIVE_FORMS_TOKEN.</span>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 6px;">
        <button
          type="button"
          id="sh-af-save-btn"
          style="padding: 8px 16px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer;"
        >
          Save AI Settings
        </button>
        <span id="sh-af-status" style="font-size: 0.85rem; color: #10b981; align-self: center;"></span>
      </div>
    </div>
  `;

  // Wire up handlers
  const endpointInput = section.querySelector('#sh-af-endpoint') as HTMLInputElement;
  const tokenInput = section.querySelector('#sh-af-token') as HTMLInputElement;
  const saveBtn = section.querySelector('#sh-af-save-btn') as HTMLButtonElement;
  const statusSpan = section.querySelector('#sh-af-status') as HTMLSpanElement;

  // Load existing config
  chrome.runtime.sendMessage({ v: 1, type: 'adaptive.config.get', request_id: `cfg-${Date.now()}` })
    .then((resp) => {
      if (resp?.ok && resp.data) {
        endpointInput.value = resp.data.endpoint || DEFAULT_ADAPTIVE_CONFIG.endpoint;
        tokenInput.value = resp.data.pairingToken || DEFAULT_ADAPTIVE_CONFIG.pairingToken;
      }
    })
    .catch(() => {});

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    try {
      await chrome.runtime.sendMessage({
        v: 1,
        type: 'adaptive.config.update',
        request_id: `up-${Date.now()}`,
        patch: {
          endpoint: endpointInput.value.trim(),
          pairingToken: tokenInput.value.trim(),
        },
      });
      statusSpan.textContent = 'Settings saved!';
      setTimeout(() => { statusSpan.textContent = ''; }, 2500);
    } catch (e: any) {
      statusSpan.textContent = `Error: ${e.message}`;
      statusSpan.style.color = '#ef4444';
    } finally {
      saveBtn.disabled = false;
    }
  });

  return section;
}
