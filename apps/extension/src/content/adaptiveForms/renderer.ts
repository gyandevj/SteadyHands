/**
 * Presentation Renderer for Adaptive Forms.
 * Applies reversible visual adaptations directly to original native controls.
 * Preserves DOM hierarchy, element identity, listeners, and native submission.
 */

import type { AdaptiveLayoutProposal } from '../../types/index.ts';
import { LocalFieldMapping } from './extractor.ts';
import { MutationJournal } from './mutationJournal.ts';

export function renderAdaptiveLayout(
  form: HTMLFormElement,
  proposal: AdaptiveLayoutProposal,
  fieldMap: Map<string, LocalFieldMapping>,
  journal: MutationJournal
): void {
  // 1. Style the form container to single-column layout
  journal.recordAddedClass(form, 'steadyhand-adapted-form');

  // 2. Track which block containers have already had headings inserted
  const styledBlocks = new Set<HTMLElement>();

  for (const section of proposal.sections) {
    if (section.fieldIds.length === 0) continue;

    // Find the first block element in this section to prepend the section title
    const firstFieldId = section.fieldIds[0];
    const firstMapping = fieldMap.get(firstFieldId);
    if (!firstMapping) continue;

    const firstBlockEl = firstMapping.block.containerEl;
    const parentNode = firstBlockEl.parentNode;

    if (parentNode) {
      // Create extension-owned section header element
      const headerEl = document.createElement('div');
      headerEl.className = 'steadyhand-section-title';
      headerEl.setAttribute('data-steadyhand-feature', 'adaptive-forms');
      headerEl.textContent = section.title;

      parentNode.insertBefore(headerEl, firstBlockEl);
      journal.recordAddedNode(headerEl, parentNode, firstBlockEl);
    }

    // 3. Apply accessibility sizing to controls in this section
    for (const fieldId of section.fieldIds) {
      const mapping = fieldMap.get(fieldId);
      if (!mapping) continue;

      const blockEl = mapping.block.containerEl;
      if (!styledBlocks.has(blockEl)) {
        styledBlocks.add(blockEl);
        journal.recordAddedClass(blockEl, 'steadyhand-adapted-block');
      }

      for (const inputEl of mapping.inputElements) {
        const tagName = (inputEl.tagName || '').toUpperCase();
        if (tagName === 'INPUT') {
          const type = ((inputEl as any).type || '').toLowerCase();
          if (type === 'radio' || type === 'checkbox') {
            const labelWrapper = inputEl.closest ? (inputEl.closest('label') || inputEl.parentElement) : inputEl.parentElement;
            if (labelWrapper) {
              journal.recordAddedClass(labelWrapper, 'steadyhand-target-large');
            }
          } else {
            journal.recordAddedClass(inputEl, 'steadyhand-control-large');
          }
        } else if (tagName === 'TEXTAREA' || tagName === 'SELECT') {
          journal.recordAddedClass(inputEl, 'steadyhand-control-large');
        }
      }
    }
  }
}
