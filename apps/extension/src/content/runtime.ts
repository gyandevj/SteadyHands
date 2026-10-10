import {
  AssistanceConfig,
  DEFAULT_ASSISTANCE_CONFIG,
  EngineOutput,
  SourceState,
  Target
} from '../types/index.js';
import { mountOverlay, OverlayElements } from '../overlay/mount.js';
import { updatePointerOverlay } from '../overlay/renderPointer.js';
import { updateCandidateOverlay } from '../overlay/renderTarget.js';
import { updateStatusStrip } from '../overlay/statusStrip.js';
import { targetRegistry } from './discovery.js';
import { geometryTracker } from './geometry.js';
import { pointerInput } from './pointerInput.js';
import { syntheticPointer } from './syntheticInput.js';
import { actionDispatcher } from './activation.js';
import { LocalInteractionEngine } from './engineStub.js';
import { teardownSteadyHand } from './cleanup.js';

// CSS string embedded for bundling into isolated world
const OVERLAY_CSS = `
:host {
  all: initial;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none !important;
  z-index: 2147483647;
  overflow: hidden;
}
.steadyhand-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none !important;
}
.steadyhand-pointer {
  position: fixed;
  width: 20px;
  height: 20px;
  transform: translate(-50%, -50%);
  pointer-events: none !important;
  will-change: left, top;
  z-index: 10;
}
.steadyhand-pointer-dot {
  width: 14px;
  height: 14px;
  margin: 3px;
  background: #38bdf8;
  border: 2px solid #0f172a;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.6);
}
.steadyhand-pointer.ambiguous .steadyhand-pointer-dot {
  background: #fbbf24;
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.6);
}
.steadyhand-candidate-box {
  position: fixed;
  border: 2px solid #38bdf8;
  border-radius: 6px;
  background: rgba(56, 189, 248, 0.12);
  pointer-events: none !important;
  box-sizing: border-box;
  opacity: 0;
  transition: opacity 0.12s ease;
  z-index: 5;
}
.steadyhand-candidate-box.visible {
  opacity: 1;
}
.steadyhand-candidate-box.ambiguous {
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
}
.steadyhand-dwell-ring {
  position: fixed;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
  pointer-events: none !important;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 9;
}
.steadyhand-dwell-ring.active {
  opacity: 1;
}
.steadyhand-dwell-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.steadyhand-dwell-circle-bg {
  fill: none;
  stroke: rgba(15, 23, 42, 0.5);
  stroke-width: 4;
}
.steadyhand-dwell-circle-fg {
  fill: none;
  stroke: #38bdf8;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 113.1;
  stroke-dashoffset: 113.1;
  transition: stroke-dashoffset 0.05s linear;
}
.steadyhand-status-badge {
  position: fixed;
  top: 14px;
  right: 16px;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #f8fafc;
  padding: 6px 12px;
  border-radius: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none !important;
  z-index: 20;
}
.steadyhand-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34d399;
}
.steadyhand-status-dot.synthetic {
  background: #38bdf8;
}
.steadyhand-status-dot.unavailable {
  background: #94a3b8;
}
`;

export class SteadyHandRuntime {
  private instanceId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  private config: AssistanceConfig = { ...DEFAULT_ASSISTANCE_CONFIG };
  private engine: LocalInteractionEngine;
  private overlay: OverlayElements | null = null;
  private running = false;
  private animFrameId: number | null = null;
  private mutationObserver: MutationObserver | null = null;
  private mutationTimeout: number | null = null;

  // Device & Transport state
  private deviceSource: SourceState = 'unavailable';
  private deviceConnected = false;

  // Assisted physical click state
  private armedCandidateTarget: Target | null = null;

  constructor() {
    this.engine = new LocalInteractionEngine(this.config);
    this.loop = this.loop.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  async init(): Promise<void> {
    // 1. Idempotent guard
    if ((window as any).__STEADYHAND_INJECTED__) {
      console.log('[SteadyHand] Runtime already active on this document.');
      return;
    }
    (window as any).__STEADYHAND_INJECTED__ = {
      instanceId: this.instanceId,
      teardown: () => this.destroy()
    };

    console.log('[SteadyHand] Initializing content script runtime...');

    // 2. Mount overlay inside Shadow DOM
    this.overlay = mountOverlay(OVERLAY_CSS);

    // 3. Request initial config & state from worker
    try {
      const resp = await chrome.runtime.sendMessage({
        v: 1,
        type: 'content.ready',
        request_id: `ready-${Date.now()}`,
        instanceId: this.instanceId
      });
      if (resp?.ok && resp.data?.config) {
        this.config = resp.data.config;
        this.engine.applyConfig(this.config);
        if (resp.data.transportStatus) {
          this.deviceConnected = resp.data.transportStatus === 'connected';
        }
        if (resp.data.deviceState?.source) {
          this.deviceSource = resp.data.deviceState.source;
        }
      }
    } catch {
      console.warn('[SteadyHand] Worker connection deferred, running standalone.');
    }

    // 4. Initial target discovery
    targetRegistry.scan();

    // 5. Watch DOM mutations (debounced 100ms, ignoring extension overlay)
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldRescan = false;
      for (const m of mutations) {
        if (
          m.target instanceof Element &&
          m.target.closest('steadyhand-overlay-host')
        ) {
          continue; // Ignore mutations inside extension overlay
        }
        shouldRescan = true;
        break;
      }
      if (shouldRescan) {
        if (this.mutationTimeout !== null) clearTimeout(this.mutationTimeout);
        this.mutationTimeout = setTimeout(() => {
          targetRegistry.scan();
          geometryTracker.invalidate();
          this.engine.cancel('dom_mutation');
        }, 100) as unknown as number;
      }
    });
    this.mutationObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'style', 'class']
    });

    // 6. Start pointer capture
    pointerInput.start();
    if (this.config.mode === 'stabilized') {
      pointerInput.hideNativeCursor();
    }

    // 7. Assisted physical click handlers
    pointerInput.onPrimaryDown((_pt, _e) => {
      if (this.armedCandidateTarget && this.armedCandidateTarget.kind === 'button') {
        // Armed on primary button down
      }
    });

    pointerInput.onPrimaryUp((_pt, e) => {
      if (this.armedCandidateTarget && this.armedCandidateTarget.kind === 'button') {
        const candidate = this.armedCandidateTarget;
        this.armedCandidateTarget = null;
        const record = targetRegistry.getRecord(candidate.id);
        if (record && record.element.isConnected) {
          // If native click target differs or would miss, assist click
          if (e.target !== record.element) {
            e.stopPropagation();
            record.element.click();
          }
        }
      }
    });

    // 8. Selection confirmation hook
    actionDispatcher.onConfirmed((selection, kind) => {
      chrome.runtime.sendMessage({
        v: 1,
        type: 'selection.confirmed',
        request_id: `sel-${Date.now()}`,
        id: selection.id,
        targetId: selection.targetId,
        kind,
        tMs: performance.now()
      }).catch(() => {});
    });

    // 9. Window event listeners for robust cancellation
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.addEventListener('scroll', this.handleScroll, { passive: true, capture: true });
    window.addEventListener('resize', this.handleResize, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // 10. Message listener for worker updates
    chrome.runtime.onMessage.addListener((msg) => {
      this.handleWorkerMessage(msg);
    });

    // 11. Start animation frame loop
    this.running = true;
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  private loop(): void {
    if (!this.running) return;

    const raw = pointerInput.getLastPoint();
    const perturbed = syntheticPointer.perturb(raw);
    const targets = targetRegistry.getAllTargets();
    const geomRev = geometryTracker.getRevision();

    const output: EngineOutput = this.engine.step({
      raw: perturbed,
      targets,
      geometryRevision: geomRev,
      configRevision: this.config.revision
    });

    // Update overlay elements
    if (this.overlay) {
      updatePointerOverlay(this.overlay, output, this.config.mode !== 'native');

      const candidateTarget = output.candidateId
        ? targets.find((t) => t.id === output.candidateId) || null
        : null;

      this.armedCandidateTarget = candidateTarget;
      updateCandidateOverlay(this.overlay, candidateTarget, output.ambiguous);

      updateStatusStrip(
        this.overlay,
        this.config.mode,
        this.deviceSource,
        this.deviceConnected
      );
    }

    // Handle dwell selection execution
    if (output.selection && output.candidateId) {
      const selectedTarget = targets.find((t) => t.id === output.candidateId);
      if (selectedTarget) {
        actionDispatcher.executeSelection(output.selection, selectedTarget);
      }
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      // Escape immediately cancels pending dwell
      this.engine.cancel('escape_key');
      this.armedCandidateTarget = null;
      if (this.overlay) {
        this.overlay.candidateBox.classList.remove('visible');
        this.overlay.dwellRing.classList.remove('active');
      }
    }
  }

  private handleScroll(): void {
    geometryTracker.updateAllGeometries();
    this.engine.cancel('scroll');
  }

  private handleResize(): void {
    geometryTracker.updateAllGeometries();
    this.engine.cancel('window_resize');
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.engine.cancel('tab_hidden');
      pointerInput.restoreNativeCursor();
    } else if (this.config.mode === 'stabilized') {
      pointerInput.hideNativeCursor();
    }
  }

  private handleWorkerMessage(msg: any): void {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'page.disable') {
      this.destroy();
    } else if (msg.type === 'settings.applied') {
      this.config = msg.config;
      this.engine.applyConfig(this.config);
      if (this.config.mode === 'stabilized') {
        pointerInput.hideNativeCursor();
      } else {
        pointerInput.restoreNativeCursor();
      }
    } else if (msg.type === 'device.state') {
      this.deviceSource = msg.source || 'unavailable';
    } else if (msg.type === 'transport.state') {
      this.deviceConnected = msg.status === 'connected';
    }
  }

  destroy(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.mutationTimeout !== null) {
      clearTimeout(this.mutationTimeout);
      this.mutationTimeout = null;
    }

    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('scroll', this.handleScroll, { capture: true });
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    teardownSteadyHand();
    this.overlay = null;
  }
}

export const runtime = new SteadyHandRuntime();
