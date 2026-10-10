import { popupAdapter } from '../adapters/popupAdapter.js';
import { PointerMode } from '../types/index.js';

// Entry point for popup.html
async function initPopup() {
  const container = document.getElementById('root');
  if (!container) return;

  // 1. Try mounting Kripa's exported UI if available
  try {
    // @ts-ignore - Kripa owns src/popup; mounted dynamically when available
    const kripaPopup = await import('../popup/index.js');
    if (typeof (kripaPopup as any).mountPopup === 'function') {
      (kripaPopup as any).mountPopup(container, popupAdapter);
      return;
    }
  } catch {
    // Kripa's UI is not yet compiled or available; proceed to fallback UI
  }

  // 2. Render robust accessible fallback UI
  renderFallbackPopup(container);
}

async function renderFallbackPopup(container: HTMLElement) {
  const state = await popupAdapter.getState();

    const isConnected = state.transportStatus === 'connected';
    const isLive = isConnected && state.deviceSource === 'live';
    const isMock = isConnected && state.deviceSource === 'synthetic';

    const deviceBadgeColor = isLive ? '#10b981' : (isMock ? '#38bdf8' : '#94a3b8');
    const deviceLabel = isLive 
      ? 'Arduino UNO R4 (Live COM5)' 
      : (isMock ? 'Mock Stream (Bridge)' : 'Standalone (Local Filter)');

    let tremorText = 'Resting / Calibrated';
    let tremorColor = '#34d399';
    if (state.deviceMotion === 'periodic_motion') {
      tremorText = 'Tremor Detected: Active Compensation';
      tremorColor = '#f59e0b';
    } else if (state.deviceMotion === 'other_motion') {
      tremorText = 'Active Motion (Tapping/Banging)';
      tremorColor = '#38bdf8';
    } else if (state.deviceMotion === 'unknown') {
      tremorText = 'Calibrating Sensor...';
      tremorColor = '#94a3b8';
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:10px;">
        <h2 style="font-size:16px; font-weight:600; color:#f8fafc; margin:0;">SteadyHand</h2>
        <span id="sh-status-pill" style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:12px; background:${state.isPageEnabled ? '#059669' : '#475569'}; color:#fff;">
          ${state.isPageEnabled ? 'Active' : 'Disabled'}
        </span>
      </div>

      <div style="font-size:12px; color:#94a3b8; line-height:1.4;">
        ${state.isPageSupported 
          ? 'Assistance is available on this webpage.' 
          : '<span style="color:#f87171;">Unsupported page (Chrome internal or Web Store URL).</span>'}
      </div>

      <div style="display:flex; gap:8px;">
        <button id="sh-btn-enable" style="flex:1; padding:8px 12px; background:#38bdf8; border:none; border-radius:6px; font-weight:600; font-size:12px; color:#0f172a; cursor:pointer;" ${!state.isPageSupported ? 'disabled' : ''}>
          Enable on this page
        </button>
        <button id="sh-btn-disable" style="flex:1; padding:8px 12px; background:#334155; border:none; border-radius:6px; font-weight:600; font-size:12px; color:#f8fafc; cursor:pointer;">
          Disable
        </button>
      </div>

      <div style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:8px 10px; font-size:11px; display:flex; flex-direction:column; gap:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#94a3b8;">Sensor Feed:</span>
          <span id="sh-sensor-label" style="color:${deviceBadgeColor}; font-weight:600;">● ${deviceLabel}</span>
        </div>
        ${isConnected ? `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#94a3b8;">Trackpad Tremor:</span>
          <span id="sh-tremor-label" style="color:${tremorColor}; font-weight:600;">${tremorText}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#94a3b8;">Dominant Frequency:</span>
          <span id="sh-hz-label" style="color:#f8fafc; font-weight:600;">${state.dominantHz ? state.dominantHz.toFixed(1) + ' Hz' : 'Quiet / Calibrated'}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#94a3b8;">Tremor Amplitude:</span>
          <span id="sh-amp-label" style="color:#f8fafc; font-weight:600;">${state.bandRmsG ? (state.bandRmsG * 1000).toFixed(0) + ' mg' : '< 10 mg'}</span>
        </div>` : `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#94a3b8;">Stabilizer:</span>
          <span id="sh-stabilizer-label" style="color:#38bdf8; font-weight:600;">1-Euro Local Filter</span>
        </div>`}
      </div>

      <div style="background:#1e293b; padding:10px; border-radius:6px; display:flex; flex-direction:column; gap:8px; border:1px solid #334155;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
          <span>Pointer Mode:</span>
          <select id="sh-select-mode" style="background:#0f172a; color:#f8fafc; border:1px solid #475569; border-radius:4px; padding:2px 6px; font-size:11px;">
            <option value="stabilized" ${state.config.mode === 'stabilized' ? 'selected' : ''}>Stabilized</option>
            <option value="native" ${state.config.mode === 'native' ? 'selected' : ''}>Native</option>
            <option value="raw_virtual" ${state.config.mode === 'raw_virtual' ? 'selected' : ''}>Raw Virtual (Test)</option>
          </select>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
          <span>Dwell Action:</span>
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" id="sh-chk-dwell" ${state.config.dwell.enabled ? 'checked' : ''} />
            <span>Enabled</span>
          </label>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
          <span>Dwell Time:</span>
          <span id="sh-dwell-time-label" style="font-weight:600; color:#38bdf8;">${state.config.dwell.duration_ms} ms</span>
        </div>
        <input type="range" id="sh-range-dwell" min="400" max="1500" step="50" value="${state.config.dwell.duration_ms}" style="width:100%; cursor:pointer;" />
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#64748b; padding-top:4px;">
        <span>Assistance: <strong style="color:#38bdf8;">1-Euro Adaptive</strong></span>
        <a href="#" id="sh-link-options" style="color:#38bdf8; text-decoration:none;">Settings &rarr;</a>
      </div>
    `;

  // Wire event handlers
  document.getElementById('sh-btn-enable')?.addEventListener('click', async () => {
    await popupAdapter.enablePage();
    renderFallbackPopup(container);
  });

  document.getElementById('sh-btn-disable')?.addEventListener('click', async () => {
    await popupAdapter.disablePage();
    renderFallbackPopup(container);
  });

  document.getElementById('sh-select-mode')?.addEventListener('change', async (e) => {
    const val = (e.target as HTMLSelectElement).value as PointerMode;
    await popupAdapter.updateSettings({ mode: val });
  });

  document.getElementById('sh-chk-dwell')?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    await popupAdapter.updateSettings({ dwell: { ...state.config.dwell, enabled: checked } });
  });

  const range = document.getElementById('sh-range-dwell') as HTMLInputElement | null;
  range?.addEventListener('input', (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    const lbl = document.getElementById('sh-dwell-time-label');
    if (lbl) lbl.textContent = `${val} ms`;
  });
  range?.addEventListener('change', async (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    await popupAdapter.updateSettings({ dwell: { ...state.config.dwell, duration_ms: val } });
  });

  document.getElementById('sh-link-options')?.addEventListener('click', (e) => {
    e.preventDefault();
    popupAdapter.openOptions();
  });

  // Polling update loop (400ms) for real-time sensor & tremor data display
  const pollTimer = setInterval(async () => {
    const fresh = await popupAdapter.getState();
    const freshConnected = fresh.transportStatus === 'connected';
    const freshLive = freshConnected && fresh.deviceSource === 'live';
    const freshMock = freshConnected && fresh.deviceSource === 'synthetic';

    const lbl = document.getElementById('sh-sensor-label');
    if (lbl) {
      lbl.style.color = freshLive ? '#10b981' : (freshMock ? '#38bdf8' : '#94a3b8');
      lbl.textContent = `● ${freshLive ? 'Arduino UNO R4 (Live COM5)' : (freshMock ? 'Mock Stream (Bridge)' : 'Standalone (Local Filter)')}`;
    }

    const trem = document.getElementById('sh-tremor-label');
    if (trem) {
      if (fresh.deviceMotion === 'periodic_motion') {
        trem.style.color = '#f59e0b';
        trem.textContent = 'Tremor Detected: Active Compensation';
      } else if (fresh.deviceMotion === 'other_motion') {
        trem.style.color = '#38bdf8';
        trem.textContent = 'Active Motion (Tapping/Banging)';
      } else if (fresh.deviceMotion === 'unknown') {
        trem.style.color = '#94a3b8';
        trem.textContent = 'Calibrating Sensor...';
      } else {
        trem.style.color = '#34d399';
        trem.textContent = 'Resting / Calibrated';
      }
    }

    const hz = document.getElementById('sh-hz-label');
    if (hz) {
      hz.textContent = fresh.dominantHz ? `${fresh.dominantHz.toFixed(1)} Hz` : 'Quiet / Calibrated';
    }

    const amp = document.getElementById('sh-amp-label');
    if (amp) {
      amp.textContent = fresh.bandRmsG ? `${(fresh.bandRmsG * 1000).toFixed(0)} mg` : '< 10 mg';
    }
  }, 400);

  window.addEventListener('unload', () => clearInterval(pollTimer));
}

document.addEventListener('DOMContentLoaded', initPopup);
