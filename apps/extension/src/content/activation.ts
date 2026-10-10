import { Target, SelectionEvent } from '../types/index.js';
import { targetRegistry } from './discovery.js';

export class ActionDispatcher {
  private lastExecutedSelectionId: string | null = null;
  private onConfirmedCallbacks: Array<(selection: SelectionEvent, kind: string) => void> = [];

  onConfirmed(cb: (selection: SelectionEvent, kind: string) => void): () => void {
    this.onConfirmedCallbacks.push(cb);
    return () => {
      this.onConfirmedCallbacks = this.onConfirmedCallbacks.filter((c) => c !== cb);
    };
  }

  executeSelection(selection: SelectionEvent, target: Target): boolean {
    if (this.lastExecutedSelectionId === selection.id) {
      return false; // Prevent duplicate dispatch
    }

    const record = targetRegistry.getRecord(target.id);
    if (!record || !record.element.isConnected) {
      return false;
    }

    const el = record.element;

    // Revalidate element state at dispatch time
    if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
      return false;
    }

    if (targetRegistry.isOccluded(target)) {
      return false;
    }

    this.lastExecutedSelectionId = selection.id;

    // Execute based on target kind
    if (target.kind === 'focus') {
      el.focus();
    } else if (target.kind === 'toggle') {
      if (el instanceof HTMLInputElement) {
        if (el.type === 'checkbox') {
          el.checked = !el.checked;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.type === 'radio') {
          if (!el.checked) {
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else {
          el.click();
        }
      } else {
        el.click();
      }
    } else if (target.kind === 'button') {
      el.click();
    }

    // Notify listeners / worker
    for (const cb of this.onConfirmedCallbacks) {
      cb(selection, target.kind);
    }

    return true;
  }

  reset(): void {
    this.lastExecutedSelectionId = null;
  }
}

export const actionDispatcher = new ActionDispatcher();
