/**
 * Read-Only Preview Overlay for Adaptive Forms with Gemini.
 * Displays proposed section structure and layout hints before application.
 * Contains zero live inputs or operable submission controls.
 */

import type { AdaptiveLayoutProposal } from '../../types/index.ts';
import { LocalFieldMapping } from './extractor.ts';

export class AdaptivePreviewOverlay {
  private containerEl: HTMLElement | null = null;
  private onKeyDownBound: ((e: KeyboardEvent) => void) | null = null;

  show(
    proposal: AdaptiveLayoutProposal,
    fieldMap: Map<string, LocalFieldMapping>,
    onApply: () => void,
    onCancel: () => void
  ): void {
    this.dismiss();

    const host = document.createElement('div');
    host.id = 'steadyhand-adaptive-preview-host';
    host.setAttribute('data-steadyhand-ui', 'true');
    host.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483640;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const card = document.createElement('div');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Adaptive Form Layout Preview');
    card.style.cssText = `
      background: #ffffff;
      border-radius: 12px;
      max-width: 520px;
      width: 90%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;';
    const title = document.createElement('h2');
    title.style.cssText = 'margin: 0 0 6px 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;';
    title.textContent = 'Adaptive Layout Preview';
    const subtitle = document.createElement('p');
    subtitle.style.cssText = 'margin: 0; font-size: 0.88rem; color: #64748b;';
    subtitle.textContent = 'Structured by Gemini for tremor accessibility. Your original values will be preserved.';
    header.appendChild(title);
    header.appendChild(subtitle);

    // Body: sections list
    const body = document.createElement('div');
    body.style.cssText = 'padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px;';

    proposal.sections.forEach((sec, idx) => {
      const secBox = document.createElement('div');
      secBox.style.cssText = 'border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; background: #fafafa;';

      const secTitle = document.createElement('div');
      secTitle.style.cssText = 'font-weight: 700; font-size: 0.95rem; color: #1e293b; margin-bottom: 6px;';
      secTitle.textContent = `${idx + 1}. ${sec.title}`;
      secBox.appendChild(secTitle);

      const fieldList = document.createElement('div');
      fieldList.style.cssText = 'font-size: 0.85rem; color: #475569; display: flex; flex-direction: column; gap: 4px;';

      for (const fid of sec.fieldIds) {
        const mapping = fieldMap.get(fid);
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; gap: 6px;';
        const bullet = document.createElement('span');
        bullet.style.cssText = 'color: #3b82f6; font-weight: bold;';
        bullet.textContent = '•';
        const labelText = document.createElement('span');
        labelText.textContent = mapping ? `${mapping.field.label} (${mapping.field.type})` : fid;
        item.appendChild(bullet);
        item.appendChild(labelText);
        fieldList.appendChild(item);
      }
      secBox.appendChild(fieldList);
      body.appendChild(secBox);
    });

    // Footer actions
    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; background: #f8fafc;';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #475569;
      background: #e2e8f0;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    `;
    cancelBtn.addEventListener('click', () => {
      this.dismiss();
      onCancel();
    });

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.textContent = 'Apply Adaptive Layout';
    applyBtn.style.cssText = `
      padding: 8px 18px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #ffffff;
      background: #2563eb;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    `;
    applyBtn.addEventListener('click', () => {
      this.dismiss();
      onApply();
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(applyBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    host.appendChild(card);
    document.body.appendChild(host);

    this.containerEl = host;

    // Keyboard accessibility: Escape to cancel
    this.onKeyDownBound = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.dismiss();
        onCancel();
      }
    };
    window.addEventListener('keydown', this.onKeyDownBound);
    applyBtn.focus();
  }

  dismiss(): void {
    if (this.onKeyDownBound) {
      window.removeEventListener('keydown', this.onKeyDownBound);
      this.onKeyDownBound = null;
    }
    if (this.containerEl && this.containerEl.parentNode) {
      this.containerEl.parentNode.removeChild(this.containerEl);
    }
    this.containerEl = null;
  }

  get isOpen(): boolean {
    return this.containerEl !== null;
  }
}
