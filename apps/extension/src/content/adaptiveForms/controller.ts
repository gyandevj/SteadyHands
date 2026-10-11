/**
 * Adaptive Forms Controller.
 * Orchestrates detection, extraction, preview, reversible mutation,
 * and synchronous layout transition guards to preserve pointer engine safety.
 */

import type {
  AdaptiveFormData,
  AdaptiveLayoutProposal,
  AdaptiveFormStatus,
} from '../../types/index.ts';
import { detectSupportedForm, FormDetectionResult } from './detector.ts';
import { extractSanitizedFormData, ExtractionResult } from './extractor.ts';
import { MutationJournal } from './mutationJournal.ts';
import { renderAdaptiveLayout } from './renderer.ts';
import { AdaptivePreviewOverlay } from './preview.ts';

export interface LayoutTransitionGuardCallbacks {
  cancelActiveDwell: (reason: string) => void;
  invalidateGeometry: () => void;
  rescanTargets: () => void;
}

export class AdaptiveFormsController {
  private status: AdaptiveFormStatus = {
    state: 'unsupported',
    fieldCount: 0,
    lastUpdated: Date.now(),
  };

  private detectionResult: FormDetectionResult | null = null;
  private extractionResult: ExtractionResult | null = null;
  private currentProposal: AdaptiveLayoutProposal | null = null;
  private journal = new MutationJournal();
  private previewOverlay = new AdaptivePreviewOverlay();
  private guardCallbacks: LayoutTransitionGuardCallbacks | null = null;

  constructor(guardCallbacks?: LayoutTransitionGuardCallbacks) {
    if (guardCallbacks) {
      this.guardCallbacks = guardCallbacks;
    }
  }

  setGuardCallbacks(callbacks: LayoutTransitionGuardCallbacks): void {
    this.guardCallbacks = callbacks;
  }

  getStatus(): AdaptiveFormStatus {
    return this.status;
  }

  getCurrentProposal(): AdaptiveLayoutProposal | null {
    return this.currentProposal;
  }

  detect(): AdaptiveFormStatus {
    // Check if form is currently in adapted state on the page
    const isAlreadyAdapted =
      this.status.state === 'applied' ||
      (typeof document !== 'undefined' &&
        (document.querySelector('.ai-section-card') !== null ||
          document.querySelector('.steadyhand-section-title') !== null ||
          document.getElementById('btn-restore-layout')?.style.display === 'inline-flex'));

    if (isAlreadyAdapted) {
      this.status = {
        state: 'applied',
        formId: this.status.formId || 'form',
        fieldCount: this.status.fieldCount || 5,
        lastUpdated: Date.now(),
      };
      return this.status;
    }

    this.detectionResult = detectSupportedForm(document);

    if (!this.detectionResult.supported || !this.detectionResult.formElement || !this.detectionResult.blocks) {
      this.status = {
        state: 'unsupported',
        fieldCount: 0,
        reason: this.detectionResult.reason || 'No supported form found',
        lastUpdated: Date.now(),
      };
      this.extractionResult = null;
      return this.status;
    }

    this.extractionResult = extractSanitizedFormData(
      this.detectionResult.formElement,
      this.detectionResult.blocks
    );

    this.status = {
      state: 'detected',
      formId: this.extractionResult.data.formId,
      fieldCount: this.extractionResult.data.fields.length,
      lastUpdated: Date.now(),
    };

    return this.status;
  }

  getExtractedForm(): AdaptiveFormData | null {
    if (!this.extractionResult) {
      this.detect();
    }
    return this.extractionResult ? this.extractionResult.data : null;
  }

  showPreview(
    proposal: AdaptiveLayoutProposal,
    onApplyRequested: () => void,
    onCancelRequested: () => void
  ): void {
    if (!this.extractionResult) {
      throw new Error('No extracted form available for preview');
    }

    this.currentProposal = proposal;
    this.status = {
      ...this.status,
      state: 'previewing',
      lastUpdated: Date.now(),
    };

    this.previewOverlay.show(
      proposal,
      this.extractionResult.fieldMap,
      () => {
        this.status = { ...this.status, state: 'detected', lastUpdated: Date.now() };
        onApplyRequested();
      },
      () => {
        this.status = { ...this.status, state: 'detected', lastUpdated: Date.now() };
        onCancelRequested();
      }
    );
  }

  dismissPreview(): void {
    this.previewOverlay.dismiss();
  }

  /**
   * Synchronous Layout Transition Guard:
   * 1. Cancel active dwell immediately.
   * 2. Apply DOM modifications.
   * 3. Invalidate geometry and rescan target bounds.
   */
  applyProposal(proposal: AdaptiveLayoutProposal): void {
    if (!this.detectionResult?.formElement || !this.extractionResult) {
      throw new Error('Cannot apply layout: form detection state invalid');
    }

    // Guard: synchronous dwell cancellation
    if (this.guardCallbacks) {
      this.guardCallbacks.cancelActiveDwell('layout_transition_apply');
    }

    // Revert any previous adaptation before applying new
    if (this.journal.isModified) {
      this.journal.restore();
    }

    renderAdaptiveLayout(
      this.detectionResult.formElement,
      proposal,
      this.extractionResult.fieldMap,
      this.journal
    );

    this.currentProposal = proposal;
    this.status = {
      ...this.status,
      state: 'applied',
      lastUpdated: Date.now(),
    };

    // Guard: rescan targets and refresh geometry
    if (this.guardCallbacks) {
      this.guardCallbacks.rescanTargets();
      this.guardCallbacks.invalidateGeometry();
    }
  }

  /**
   * Synchronous Layout Transition Guard on Restore:
   * 1. Cancel active dwell immediately.
   * 2. Restore original DOM presentation.
   * 3. Invalidate geometry and rescan target bounds.
   */
  restoreOriginal(): void {
    if (!this.journal.isModified) {
      return;
    }

    // Guard: synchronous dwell cancellation
    if (this.guardCallbacks) {
      this.guardCallbacks.cancelActiveDwell('layout_transition_restore');
    }

    this.journal.restore();
    this.currentProposal = null;

    this.status = {
      ...this.status,
      state: 'restored',
      lastUpdated: Date.now(),
    };

    // Guard: rescan targets and refresh geometry
    if (this.guardCallbacks) {
      this.guardCallbacks.rescanTargets();
      this.guardCallbacks.invalidateGeometry();
    }
  }

  teardown(): void {
    this.previewOverlay.dismiss();
    this.restoreOriginal();
    this.detectionResult = null;
    this.extractionResult = null;
    this.currentProposal = null;
  }
}
