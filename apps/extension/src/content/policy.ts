import { TargetKind } from '../types/index.js';

export interface EligibilityResult {
  eligible: boolean;
  kind?: TargetKind;
  dwellAllowed?: boolean;
}

export function classifyElement(el: Element): EligibilityResult {
  // Ignore elements inside extension host or detached nodes
  if (!el.isConnected || el.closest('steadyhand-overlay-host')) {
    return { eligible: false };
  }

  // Check visibility and disabled state
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
    return { eligible: false };
  }

  const htmlEl = el as HTMLElement;
  const style = window.getComputedStyle(htmlEl);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return { eligible: false };
  }

  const tagName = el.tagName.toLowerCase();

  // 1. Inputs
  if (tagName === 'input') {
    const input = el as HTMLInputElement;
    const type = (input.type || 'text').toLowerCase();

    if (type === 'checkbox' || type === 'radio') {
      return { eligible: true, kind: 'toggle', dwellAllowed: true };
    }

    if (
      type === 'text' ||
      type === 'search' ||
      type === 'email' ||
      type === 'password' ||
      type === 'tel' ||
      type === 'url' ||
      type === 'number'
    ) {
      return { eligible: true, kind: 'focus', dwellAllowed: true };
    }

    if (type === 'submit' || type === 'reset') {
      // Form submit inputs preserve native review/submission path; no dwell
      return { eligible: true, kind: 'button', dwellAllowed: false };
    }

    if (type === 'button') {
      return { eligible: true, kind: 'button', dwellAllowed: false };
    }

    // Native pickers (file, date, color) retain native interaction
    return { eligible: false };
  }

  // 2. Textarea
  if (tagName === 'textarea') {
    return { eligible: true, kind: 'focus', dwellAllowed: true };
  }

  // 3. Buttons
  if (tagName === 'button') {
    const button = el as HTMLButtonElement;
    const type = (button.type || 'submit').toLowerCase();

    if (type === 'submit') {
      // Submit buttons must never dwell-activate
      return { eligible: true, kind: 'button', dwellAllowed: false };
    }

    // Ordinary buttons: eligible for assisted physical clicks in P0
    return { eligible: true, kind: 'button', dwellAllowed: false };
  }

  // 4. ARIA roles
  const role = el.getAttribute('role')?.toLowerCase();
  if (role === 'checkbox' || role === 'switch') {
    return { eligible: true, kind: 'toggle', dwellAllowed: true };
  }
  if (role === 'textbox' || role === 'searchbox') {
    return { eligible: true, kind: 'focus', dwellAllowed: true };
  }
  if (role === 'button') {
    return { eligible: true, kind: 'button', dwellAllowed: false };
  }

  return { eligible: false };
}
