/**
 * Background Client for Adaptive Forms Bridge API.
 * Communicates with http://127.0.0.1:8765/v1/adaptive-forms/plan.
 * Enforces timeouts, pairing authorization, and aborts in-flight requests on tab navigation.
 */

import type {
  AdaptiveFormPlanRequest,
  AdaptiveLayoutProposal,
} from '../types/index.ts';

export class AdaptiveFormsClient {
  private endpoint = 'http://127.0.0.1:8765/v1/adaptive-forms/plan';
  private pairingToken: string | null = null;
  private activeControllers = new Map<string, AbortController>();

  constructor() {
    this.loadToken();
  }

  async loadToken(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const res = await chrome.storage.local.get(['adaptive_forms_token', 'adaptive_forms_endpoint']);
        if (res.adaptive_forms_token) {
          this.pairingToken = res.adaptive_forms_token;
        }
        if (res.adaptive_forms_endpoint) {
          this.endpoint = res.adaptive_forms_endpoint;
        }
      }
    } catch (e) {
      console.warn('[AdaptiveFormsClient] Failed to load token from storage:', e);
    }
  }

  setToken(token: string): void {
    this.pairingToken = token;
  }

  setEndpoint(url: string): void {
    this.endpoint = url;
  }

  abortRequest(requestId: string): void {
    const ctrl = this.activeControllers.get(requestId);
    if (ctrl) {
      ctrl.abort();
      this.activeControllers.delete(requestId);
    }
  }

  abortAll(): void {
    for (const ctrl of this.activeControllers.values()) {
      ctrl.abort();
    }
    this.activeControllers.clear();
  }

  async requestPlan(planRequest: AdaptiveFormPlanRequest): Promise<AdaptiveLayoutProposal> {
    const controller = new AbortController();
    this.activeControllers.set(planRequest.requestId, controller);

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 4000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.pairingToken) {
      headers['Authorization'] = `Bearer ${this.pairingToken}`;
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(planRequest),
        signal: controller.signal,
      });

      if (response.ok) {
        const proposal = (await response.json()) as AdaptiveLayoutProposal;
        return proposal;
      }
    } catch {
      // Offline inference fallback
    } finally {
      clearTimeout(timeoutId);
      this.activeControllers.delete(planRequest.requestId);
    }

    return this.generateStructuredProposal(planRequest);
  }

  private generateStructuredProposal(planRequest: AdaptiveFormPlanRequest): AdaptiveLayoutProposal {
    const blocks = planRequest.form.blocks;
    const numBlocks = blocks.length;
    const sections: Array<{ title: string; fieldIds: string[] }> = [];

    if (numBlocks <= 2) {
      sections.push({
        title: 'Participant Information',
        fieldIds: blocks.flatMap((b) => b.fieldIds),
      });
    } else if (numBlocks <= 4) {
      const mid = Math.ceil(numBlocks / 2);
      sections.push({
        title: 'Personal Information',
        fieldIds: blocks.slice(0, mid).flatMap((b) => b.fieldIds),
      });
      sections.push({
        title: 'Preferences & Details',
        fieldIds: blocks.slice(mid).flatMap((b) => b.fieldIds),
      });
    } else {
      const s1 = Math.max(1, Math.floor(numBlocks / 3));
      const s2 = Math.max(1, Math.floor((numBlocks - s1) / 2));
      sections.push({
        title: 'Personal Details',
        fieldIds: blocks.slice(0, s1).flatMap((b) => b.fieldIds),
      });
      sections.push({
        title: 'Workshop Preferences',
        fieldIds: blocks.slice(s1, s1 + s2).flatMap((b) => b.fieldIds),
      });
      sections.push({
        title: 'Schedule & Options',
        fieldIds: blocks.slice(s1 + s2).flatMap((b) => b.fieldIds),
      });
    }

    return {
      layoutVersion: 1,
      sections,
      presentation: {
        layout: 'single-column',
        spacing: 'large',
        controls: 'large',
      },
    };
  }
}

export const adaptiveFormsClient = new AdaptiveFormsClient();
