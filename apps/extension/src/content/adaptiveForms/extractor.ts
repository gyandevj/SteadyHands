/**
 * Metadata Extractor for Adaptive Forms.
 * Builds privacy-sanitized structural representation using document-local aliases.
 * Never serializes user-entered values, HTML, or personal information.
 */

import type {
  AdaptiveFormData,
  AdaptiveField,
  AdaptiveBlock,
  AdaptiveFieldOption,
  AdaptiveFieldType,
} from '../../types/index.ts';
import { FormBlockInfo } from './detector.ts';

export interface LocalFieldMapping {
  field: AdaptiveField;
  inputElements: HTMLElement[];
  block: FormBlockInfo;
}

export interface ExtractionResult {
  data: AdaptiveFormData;
  fieldMap: Map<string, LocalFieldMapping>;
}

function findLabelForElement(el: HTMLElement): string {
  if (!el) return 'Untitled Field';

  // 1. Explicit <label for="...">
  if (el.id && typeof document !== 'undefined' && typeof document.querySelector === 'function') {
    try {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label && label.textContent) {
        return label.textContent.trim().replace(/\s*\*\s*$/, '');
      }
    } catch {}
  }

  // 2. Enclosing <label>
  const parentLabel = typeof el.closest === 'function' ? el.closest('label') : null;
  if (parentLabel && parentLabel.textContent) {
    if (typeof parentLabel.cloneNode === 'function') {
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      if (clone.querySelectorAll) {
        clone.querySelectorAll('input, select, textarea').forEach(n => n.remove());
      }
      const txt = clone.textContent?.trim();
      if (txt) return txt.replace(/\s*\*\s*$/, '');
    } else {
      return parentLabel.textContent.trim().replace(/\s*\*\s*$/, '');
    }
  }

  // 3. Aria-label
  if (typeof el.getAttribute === 'function') {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return ariaLabel.trim();
    }
    const placeholder = el.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) {
      return placeholder.trim();
    }
    const name = el.getAttribute('name');
    if (name && name.trim()) {
      return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  return 'Untitled Field';
}

function findLegendForFieldset(fs: HTMLElement): string {
  const legend = fs.querySelector('legend');
  if (legend && legend.textContent) {
    return legend.textContent.trim().replace(/\s*\*\s*$/, '');
  }
  return 'Selection Group';
}

export function extractSanitizedFormData(
  form: HTMLFormElement,
  blocks: FormBlockInfo[]
): ExtractionResult {
  let fieldSeq = 1;
  const fields: AdaptiveField[] = [];
  const adaptiveBlocks: AdaptiveBlock[] = [];
  const fieldMap = new Map<string, LocalFieldMapping>();

  for (const block of blocks) {
    const blockFieldIds: string[] = [];

    if (block.isRadioGroup && block.elements.length > 0) {
      // Radio group is treated as ONE logical field with multiple options
      const fieldId = `field-${fieldSeq++}`;
      blockFieldIds.push(fieldId);

      // Find group title from legend or enclosing label
      const fieldset = block.containerEl.closest('fieldset');
      const groupLabel = fieldset
        ? findLegendForFieldset(fieldset)
        : findLabelForElement(block.containerEl);

      const options: AdaptiveFieldOption[] = [];
      let optSeq = 1;
      for (const radio of block.elements) {
        const optLabel = findLabelForElement(radio);
        options.push({
          id: `opt-${optSeq++}`,
          label: optLabel.substring(0, 80),
        });
      }

      const radioField: AdaptiveField = {
        id: fieldId,
        type: 'radio',
        label: groupLabel.substring(0, 80),
        required: (block.elements[0] as HTMLInputElement).required || false,
        options,
      };

      fields.push(radioField);
      fieldMap.set(fieldId, {
        field: radioField,
        inputElements: block.elements,
        block,
      });

    } else {
      // Standard input/textarea/select/checkbox controls
      for (const el of block.elements) {
        const fieldId = `field-${fieldSeq++}`;
        blockFieldIds.push(fieldId);

        let type: AdaptiveFieldType = 'text';
        let options: AdaptiveFieldOption[] | undefined;
        const tagName = (el.tagName || '').toUpperCase();

        if (tagName === 'TEXTAREA') {
          type = 'textarea';
        } else if (tagName === 'SELECT') {
          type = 'select';
          const selectEl = el as any;
          options = Array.from(selectEl.options || []).map((opt: any, idx: number) => ({
            id: `opt-${idx + 1}`,
            label: (opt.textContent || opt.value || `Option ${idx + 1}`).trim().substring(0, 80),
          }));
        } else if (tagName === 'INPUT') {
          if ((el as any).type === 'checkbox') {
            type = 'checkbox';
          } else {
            type = 'text';
          }
        }

        const label = findLabelForElement(el).substring(0, 80);
        const required = (el as any).required || false;

        const field: AdaptiveField = {
          id: fieldId,
          type,
          label,
          required,
          ...(options ? { options } : {}),
        };

        fields.push(field);
        fieldMap.set(fieldId, {
          field,
          inputElements: [el],
          block,
        });
      }
    }

    adaptiveBlocks.push({
      id: block.blockId,
      fieldIds: blockFieldIds,
    });
  }

  const formId = form.id && /^[a-zA-Z0-9_-]+$/.test(form.id) ? form.id : 'form-1';

  return {
    data: {
      formId,
      fields,
      blocks: adaptiveBlocks,
    },
    fieldMap,
  };
}
