import { optionsAdapter } from '../adapters/optionsAdapter.js';
import { createAdaptiveSettingsSection } from '../options/adaptiveSettings.js';

// Entry point for options.html
async function initOptions() {
  const container = document.getElementById('root');
  if (!container) return;

  // 1. Try mounting Kripa's exported options UI
  try {
    // @ts-ignore - Kripa owns src/options; mounted dynamically when available
    const kripaOptions = await import('../options/index.js');
    if (typeof (kripaOptions as any).mountOptions === 'function') {
      (kripaOptions as any).mountOptions(container, optionsAdapter);
      return;
    }
  } catch {
    // Fallback UI
  }

  // 2. Render robust fallback options UI
  renderFallbackOptions(container);
}

async function renderFallbackOptions(container: HTMLElement) {
  const config = await optionsAdapter.getConfig();
  const transport = await optionsAdapter.getTransportState();

  container.innerHTML = `
    <div style="border-bottom:1px solid #22304d; padding-bottom:16px;">
      <h1 style="font-size:24px; font-weight:700; color:#f1f5f9; margin:0 0 6px 0;">SteadyHand Settings & Hardware</h1>
      <p style="font-size:14px; color:#94a3b8; margin:0;">Configure pointer assistance algorithms, dwell timing, and local sensor transport.</p>
    </div>

    <!-- Section: Pointer & Dwell -->
    <div style="background:#151d30; padding:20px; border-radius:10px; border:1px solid #22304d; display:flex; flex-direction:column; gap:16px;">
      <h2 style="font-size:16px; font-weight:600; color:#38bdf8; margin:0;">Assistance Calibration</h2>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div>
          <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:#cbd5e1;">Capture Radius (px):</label>
          <input type="number" id="sh-opt-radius" value="${config.target.capture_radius_px}" min="8" max="48" style="width:100%; padding:8px 12px; background:#0b0f19; border:1px solid #334155; border-radius:6px; color:#fff;" />
        </div>
        <div>
          <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:#cbd5e1;">Ambiguity Margin (px):</label>
          <input type="number" id="sh-opt-margin" value="${config.target.ambiguity_margin_px}" min="4" max="24" style="width:100%; padding:8px 12px; background:#0b0f19; border:1px solid #334155; border-radius:6px; color:#fff;" />
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div>
          <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:#cbd5e1;">Dwell Duration (ms):</label>
          <input type="number" id="sh-opt-dwell-ms" value="${config.dwell.duration_ms}" min="400" max="2000" step="50" style="width:100%; padding:8px 12px; background:#0b0f19; border:1px solid #334155; border-radius:6px; color:#fff;" />
        </div>
        <div>
          <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:#cbd5e1;">Dwell Rearm Delay (ms):</label>
          <input type="number" id="sh-opt-rearm-ms" value="${config.dwell.rearm_ms}" min="100" max="1000" step="50" style="width:100%; padding:8px 12px; background:#0b0f19; border:1px solid #334155; border-radius:6px; color:#fff;" />
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:10px; padding-top:4px;">
        <input type="checkbox" id="sh-opt-haptics" ${config.haptics_enabled ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;" />
        <label for="sh-opt-haptics" style="font-size:13px; color:#cbd5e1; cursor:pointer;">
          Enable selection haptic feedback (requires connected actuator)
        </label>
      </div>
    </div>

    <!-- Section: Local Hardware Service -->
    <div style="background:#151d30; padding:20px; border-radius:10px; border:1px solid #22304d; display:flex; flex-direction:column; gap:16px;">
      <h2 style="font-size:16px; font-weight:600; color:#38bdf8; margin:0;">Hardware Service Connection</h2>

      <div>
        <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:#cbd5e1;">Local Service WebSocket URL:</label>
        <input type="text" id="sh-opt-endpoint" value="${transport.endpoint}" style="width:100%; padding:8px 12px; background:#0b0f19; border:1px solid #334155; border-radius:6px; color:#fff; font-family:monospace;" />
      </div>

      <div>
        <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:#cbd5e1;">Pairing Token:</label>
        <input type="password" id="sh-opt-token" placeholder="Optional or paste token from console" style="width:100%; padding:8px 12px; background:#0b0f19; border:1px solid #334155; border-radius:6px; color:#fff; font-family:monospace;" />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px; padding-top:8px;">
        <button id="sh-btn-save-conn" style="padding:8px 18px; background:#38bdf8; border:none; border-radius:6px; font-weight:600; color:#0f172a; cursor:pointer;">
          Save Connection
        </button>
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px;">
      <button id="sh-btn-reset" style="padding:8px 16px; background:#334155; border:none; border-radius:6px; color:#f87171; font-weight:600; cursor:pointer;">
        Reset to Defaults
      </button>
      <span id="sh-save-status" style="font-size:13px; color:#34d399; display:none;">Saved successfully!</span>
    </div>
  `;

  // Handlers
  document.getElementById('sh-opt-radius')?.addEventListener('change', async (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    await optionsAdapter.updateConfig({ target: { ...config.target, capture_radius_px: val } });
  });

  document.getElementById('sh-opt-margin')?.addEventListener('change', async (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    await optionsAdapter.updateConfig({ target: { ...config.target, ambiguity_margin_px: val } });
  });

  document.getElementById('sh-opt-dwell-ms')?.addEventListener('change', async (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    await optionsAdapter.updateConfig({ dwell: { ...config.dwell, duration_ms: val } });
  });

  document.getElementById('sh-opt-rearm-ms')?.addEventListener('change', async (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    await optionsAdapter.updateConfig({ dwell: { ...config.dwell, rearm_ms: val } });
  });

  document.getElementById('sh-opt-haptics')?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    await optionsAdapter.updateConfig({ haptics_enabled: checked });
  });

  document.getElementById('sh-btn-save-conn')?.addEventListener('click', async () => {
    const endpoint = (document.getElementById('sh-opt-endpoint') as HTMLInputElement).value;
    const token = (document.getElementById('sh-opt-token') as HTMLInputElement).value;
    await optionsAdapter.setConnection(endpoint, token);
    const status = document.getElementById('sh-save-status');
    if (status) {
      status.style.display = 'inline';
      setTimeout(() => { status.style.display = 'none'; }, 2500);
    }
  });

  document.getElementById('sh-btn-reset')?.addEventListener('click', async () => {
    if (confirm('Reset all SteadyHand assistance settings to defaults?')) {
      await optionsAdapter.resetConfig();
      renderFallbackOptions(container);
    }
  });

  // Mount Adaptive Forms with Gemini configuration section
  const afSection = createAdaptiveSettingsSection();
  container.appendChild(afSection);
}

document.addEventListener('DOMContentLoaded', initOptions);
