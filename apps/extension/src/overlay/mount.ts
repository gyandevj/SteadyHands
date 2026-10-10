const HOST_TAG = 'steadyhand-overlay-host';

export interface OverlayElements {
  host: HTMLElement;
  shadow: ShadowRoot;
  container: HTMLDivElement;
  pointer: HTMLDivElement;
  candidateBox: HTMLDivElement;
  dwellRing: HTMLDivElement;
  dwellCircleFg: SVGCircleElement;
  statusBadge: HTMLDivElement;
  statusText: HTMLSpanElement;
  statusDot: HTMLSpanElement;
}

export function mountOverlay(cssContent: string): OverlayElements {
  // Remove any stale existing host first
  unmountOverlay();

  const host = document.createElement(HOST_TAG);
  host.setAttribute('data-steadyhand', 'true');
  host.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none!important;z-index:2147483647;';

  const shadow = host.attachShadow({ mode: 'open' });

  // Inject stylesheet
  const style = document.createElement('style');
  style.textContent = cssContent;
  shadow.appendChild(style);

  // Injected container
  const container = document.createElement('div');
  container.className = 'steadyhand-container';

  // Candidate Box
  const candidateBox = document.createElement('div');
  candidateBox.className = 'steadyhand-candidate-box';
  container.appendChild(candidateBox);

  // Dwell progress ring
  const dwellRing = document.createElement('div');
  dwellRing.className = 'steadyhand-dwell-ring';
  dwellRing.innerHTML = `
    <svg class="steadyhand-dwell-svg" viewBox="0 0 44 44">
      <circle class="steadyhand-dwell-circle-bg" cx="22" cy="22" r="18"></circle>
      <circle class="steadyhand-dwell-circle-fg" cx="22" cy="22" r="18"></circle>
    </svg>
  `;
  const dwellCircleFg = dwellRing.querySelector('.steadyhand-dwell-circle-fg') as SVGCircleElement;
  container.appendChild(dwellRing);

  // Stabilized Pointer
  const pointer = document.createElement('div');
  pointer.className = 'steadyhand-pointer';
  pointer.innerHTML = '<div class="steadyhand-pointer-dot"></div>';
  container.appendChild(pointer);

  // Status Badge
  const statusBadge = document.createElement('div');
  statusBadge.className = 'steadyhand-status-badge';
  statusBadge.innerHTML = `
    <span class="steadyhand-status-dot"></span>
    <span class="steadyhand-status-text">SteadyHand Active</span>
  `;
  const statusDot = statusBadge.querySelector('.steadyhand-status-dot') as HTMLSpanElement;
  const statusText = statusBadge.querySelector('.steadyhand-status-text') as HTMLSpanElement;
  container.appendChild(statusBadge);

  shadow.appendChild(container);

  // Safely append to document body or root
  const root = document.body || document.documentElement;
  root.appendChild(host);

  return {
    host,
    shadow,
    container,
    pointer,
    candidateBox,
    dwellRing,
    dwellCircleFg,
    statusBadge,
    statusText,
    statusDot
  };
}

export function unmountOverlay(): void {
  const existing = document.querySelectorAll(HOST_TAG);
  existing.forEach((node) => node.remove());
}
