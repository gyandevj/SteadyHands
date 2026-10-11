/**
 * Strict runtime validation and canonical types for Adaptive Forms with Gemini.
 * Conforms to docs/contracts.md (Version 1 / V2 Additions).
 * Pure TypeScript; zero external library dependencies.
 */

import { ContractError } from './schemas.ts';

export const MAX_FIELDS = 40;
export const MAX_TOTAL_OPTIONS = 200;
export const MAX_SECTIONS = 6;
export const MAX_TITLE_LEN = 80;
export const MAX_LABEL_LEN = 80;

export type AdaptiveFieldType = 'text' | 'textarea' | 'checkbox' | 'radio' | 'select';

export interface AdaptiveFieldOption {
  readonly id: string;
  readonly label: string;
}

export interface AdaptiveField {
  readonly id: string;
  readonly type: AdaptiveFieldType;
  readonly label: string;
  readonly required: boolean;
  readonly options?: readonly AdaptiveFieldOption[];
}

export interface AdaptiveBlock {
  readonly id: string;
  readonly fieldIds: readonly string[];
}

export interface AdaptiveFormData {
  readonly formId: string;
  readonly fields: readonly AdaptiveField[];
  readonly blocks: readonly AdaptiveBlock[];
}

export interface AdaptiveFormPlanRequest {
  readonly v: 1;
  readonly requestId: string;
  readonly form: AdaptiveFormData;
}

export interface AdaptiveSection {
  readonly title: string;
  readonly fieldIds: readonly string[];
}

export interface AdaptivePresentation {
  readonly layout: 'single-column';
  readonly spacing: 'large' | 'normal' | 'compact';
  readonly controls: 'large' | 'normal';
}

export interface AdaptiveLayoutProposal {
  readonly layoutVersion: 1;
  readonly sections: readonly AdaptiveSection[];
  readonly presentation: AdaptivePresentation;
}

export type AdaptiveFormState =
  | 'unsupported'
  | 'detected'
  | 'planning'
  | 'previewing'
  | 'applied'
  | 'restored'
  | 'error';

export interface AdaptiveFormStatus {
  readonly state: AdaptiveFormState;
  readonly formId?: string;
  readonly fieldCount: number;
  readonly reason?: string;
  readonly lastUpdated: number;
}

// Helper validation assertions
function assertObj(val: unknown, field: string): Record<string, unknown> {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) {
    throw new ContractError(`Expected object, got ${val === null ? 'null' : typeof val}`, field);
  }
  return val as Record<string, unknown>;
}

function assertStr(val: unknown, field: string, maxLen = 120, minLen = 1): string {
  if (typeof val !== 'string') {
    throw new ContractError(`Expected string, got ${typeof val}`, field);
  }
  if (val.length < minLen) {
    throw new ContractError(`String is shorter than minimum ${minLen}`, field);
  }
  if (val.length > maxLen) {
    throw new ContractError(`String length ${val.length} exceeds maximum ${maxLen}`, field);
  }
  return val;
}

function assertBool(val: unknown, field: string): boolean {
  if (typeof val !== 'boolean') {
    throw new ContractError(`Expected boolean, got ${typeof val}`, field);
  }
  return val;
}

function assertAllowedKeys(obj: Record<string, unknown>, allowed: Set<string>, context: string): void {
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) {
      throw new ContractError(`Unexpected extraneous property '${k}' in ${context}`, context);
    }
  }
}

const SENSITIVE_KEYWORDS = [
  'password',
  'passwd',
  'creditcard',
  'credit-card',
  'cvv',
  'cvc',
  'ssn',
  'socialsecurity',
  'token',
  'secret',
  'private_key',
  'cardnumber'
];

/**
 * Checks for prohibited sensitive tokens in field IDs, labels, or options.
 */
export function assertNoSensitiveTokens(text: string, context: string): void {
  const lower = text.toLowerCase().replace(/[\s_-]+/g, '');
  for (const kw of SENSITIVE_KEYWORDS) {
    if (lower.includes(kw.replace(/[\s_-]+/g, ''))) {
      throw new ContractError(`Sensitive field detected ('${kw}') in ${context}`, context);
    }
  }
}

/**
 * Validates a request payload against AdaptiveFormPlanRequest schema.
 */
export function validateAdaptiveFormPlanRequest(raw: unknown): AdaptiveFormPlanRequest {
  const root = assertObj(raw, 'root');
  assertAllowedKeys(root, new Set(['v', 'requestId', 'form']), 'AdaptiveFormPlanRequest');

  if (root.v !== 1) {
    throw new ContractError(`Expected v: 1, got ${root.v}`, 'v');
  }

  const requestId = assertStr(root.requestId, 'requestId', 64, 1);
  const formData = assertObj(root.form, 'form');
  assertAllowedKeys(formData, new Set(['formId', 'fields', 'blocks']), 'AdaptiveFormData');

  const formId = assertStr(formData.formId, 'form.formId', 64, 1);
  assertNoSensitiveTokens(formId, 'form.formId');

  if (!Array.isArray(formData.fields)) {
    throw new ContractError('Expected form.fields to be an array', 'form.fields');
  }
  if (formData.fields.length === 0) {
    throw new ContractError('form.fields cannot be empty', 'form.fields');
  }
  if (formData.fields.length > MAX_FIELDS) {
    throw new ContractError(`form.fields count ${formData.fields.length} exceeds maximum ${MAX_FIELDS}`, 'form.fields');
  }

  const fieldIdsSet = new Set<string>();
  const parsedFields: AdaptiveField[] = [];
  let totalOptions = 0;

  for (let i = 0; i < formData.fields.length; i++) {
    const fObj = assertObj(formData.fields[i], `form.fields[${i}]`);
    assertAllowedKeys(fObj, new Set(['id', 'type', 'label', 'required', 'options']), `form.fields[${i}]`);

    const id = assertStr(fObj.id, `form.fields[${i}].id`, 64, 1);
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new ContractError(`Invalid characters in field ID: '${id}'`, `form.fields[${i}].id`);
    }
    if (fieldIdsSet.has(id)) {
      throw new ContractError(`Duplicate field ID '${id}'`, `form.fields[${i}].id`);
    }
    fieldIdsSet.add(id);

    const typeStr = assertStr(fObj.type, `form.fields[${i}].type`, 16, 1);
    if (!['text', 'textarea', 'checkbox', 'radio', 'select'].includes(typeStr)) {
      throw new ContractError(`Unsupported field type '${typeStr}'`, `form.fields[${i}].type`);
    }
    const type = typeStr as AdaptiveFieldType;

    const label = assertStr(fObj.label, `form.fields[${i}].label`, MAX_LABEL_LEN, 1);
    assertNoSensitiveTokens(label, `form.fields[${i}].label`);

    const required = assertBool(fObj.required, `form.fields[${i}].required`);

    let parsedOptions: AdaptiveFieldOption[] | undefined;
    if (fObj.options !== undefined) {
      if (!Array.isArray(fObj.options)) {
        throw new ContractError('options must be an array if provided', `form.fields[${i}].options`);
      }
      parsedOptions = [];
      const optIds = new Set<string>();
      for (let j = 0; j < fObj.options.length; j++) {
        const oObj = assertObj(fObj.options[j], `form.fields[${i}].options[${j}]`);
        assertAllowedKeys(oObj, new Set(['id', 'label']), `form.fields[${i}].options[${j}]`);
        const optId = assertStr(oObj.id, `form.fields[${i}].options[${j}].id`, 64, 1);
        if (optIds.has(optId)) {
          throw new ContractError(`Duplicate option ID '${optId}'`, `form.fields[${i}].options[${j}].id`);
        }
        optIds.add(optId);

        const optLabel = assertStr(oObj.label, `form.fields[${i}].options[${j}].label`, MAX_LABEL_LEN, 1);
        assertNoSensitiveTokens(optLabel, `form.fields[${i}].options[${j}].label`);
        parsedOptions.push({ id: optId, label: optLabel });
      }
      totalOptions += parsedOptions.length;
      if (totalOptions > MAX_TOTAL_OPTIONS) {
        throw new ContractError(`Total options count exceeds limit of ${MAX_TOTAL_OPTIONS}`, 'options');
      }
    }

    parsedFields.push({
      id,
      type,
      label,
      required,
      ...(parsedOptions ? { options: parsedOptions } : {})
    });
  }

  if (!Array.isArray(formData.blocks)) {
    throw new ContractError('Expected form.blocks to be an array', 'form.blocks');
  }
  const blockIdsSet = new Set<string>();
  const parsedBlocks: AdaptiveBlock[] = [];
  const coveredFields = new Set<string>();

  for (let i = 0; i < formData.blocks.length; i++) {
    const bObj = assertObj(formData.blocks[i], `form.blocks[${i}]`);
    assertAllowedKeys(bObj, new Set(['id', 'fieldIds']), `form.blocks[${i}]`);

    const id = assertStr(bObj.id, `form.blocks[${i}].id`, 64, 1);
    if (blockIdsSet.has(id)) {
      throw new ContractError(`Duplicate block ID '${id}'`, `form.blocks[${i}].id`);
    }
    blockIdsSet.add(id);

    if (!Array.isArray(bObj.fieldIds) || bObj.fieldIds.length === 0) {
      throw new ContractError('block.fieldIds must be a non-empty array', `form.blocks[${i}].fieldIds`);
    }

    const bFieldIds: string[] = [];
    for (let j = 0; j < bObj.fieldIds.length; j++) {
      const fId = assertStr(bObj.fieldIds[j], `form.blocks[${i}].fieldIds[${j}]`, 64, 1);
      if (!fieldIdsSet.has(fId)) {
        throw new ContractError(`Block references unknown field ID '${fId}'`, `form.blocks[${i}].fieldIds[${j}]`);
      }
      if (coveredFields.has(fId)) {
        throw new ContractError(`Field '${fId}' is assigned to multiple blocks`, `form.blocks[${i}].fieldIds[${j}]`);
      }
      coveredFields.add(fId);
      bFieldIds.push(fId);
    }

    parsedBlocks.push({ id, fieldIds: bFieldIds });
  }

  // Ensure every field is in a block
  for (const f of parsedFields) {
    if (!coveredFields.has(f.id)) {
      throw new ContractError(`Field '${f.id}' is not included in any block`, 'form.blocks');
    }
  }

  return {
    v: 1,
    requestId,
    form: {
      formId,
      fields: parsedFields,
      blocks: parsedBlocks
    }
  };
}

/**
 * Validates a Gemini layout proposal against AdaptiveLayoutProposal schema
 * and optionally validates semantic alignment with the original request form.
 */
export function validateAdaptiveLayoutProposal(
  raw: unknown,
  requestForm?: AdaptiveFormData
): AdaptiveLayoutProposal {
  const root = assertObj(raw, 'root');
  assertAllowedKeys(root, new Set(['layoutVersion', 'sections', 'presentation']), 'AdaptiveLayoutProposal');

  if (root.layoutVersion !== 1) {
    throw new ContractError(`Expected layoutVersion: 1, got ${root.layoutVersion}`, 'layoutVersion');
  }

  if (!Array.isArray(root.sections)) {
    throw new ContractError('Expected sections to be an array', 'sections');
  }
  if (root.sections.length === 0) {
    throw new ContractError('sections cannot be empty', 'sections');
  }
  if (root.sections.length > MAX_SECTIONS) {
    throw new ContractError(`sections count ${root.sections.length} exceeds maximum ${MAX_SECTIONS}`, 'sections');
  }

  const seenFieldIds = new Set<string>();
  const flattenedFieldIds: string[] = [];
  const parsedSections: AdaptiveSection[] = [];

  for (let i = 0; i < root.sections.length; i++) {
    const sObj = assertObj(root.sections[i], `sections[${i}]`);
    assertAllowedKeys(sObj, new Set(['title', 'fieldIds']), `sections[${i}]`);

    const title = assertStr(sObj.title, `sections[${i}].title`, MAX_TITLE_LEN, 1);
    assertNoSensitiveTokens(title, `sections[${i}].title`);

    if (!Array.isArray(sObj.fieldIds) || sObj.fieldIds.length === 0) {
      throw new ContractError(`Section '${title}' fieldIds must be a non-empty array`, `sections[${i}].fieldIds`);
    }

    const sFieldIds: string[] = [];
    for (let j = 0; j < sObj.fieldIds.length; j++) {
      const fId = assertStr(sObj.fieldIds[j], `sections[${i}].fieldIds[${j}]`, 64, 1);
      if (seenFieldIds.has(fId)) {
        throw new ContractError(`Field ID '${fId}' appears multiple times across sections`, `sections[${i}].fieldIds[${j}]`);
      }
      seenFieldIds.add(fId);
      sFieldIds.push(fId);
      flattenedFieldIds.push(fId);
    }

    parsedSections.push({ title, fieldIds: sFieldIds });
  }

  // Validate presentation options
  const presObj = assertObj(root.presentation, 'presentation');
  assertAllowedKeys(presObj, new Set(['layout', 'spacing', 'controls']), 'AdaptivePresentation');

  const layout = assertStr(presObj.layout, 'presentation.layout', 32, 1);
  if (layout !== 'single-column') {
    throw new ContractError(`Invalid presentation.layout: '${layout}'. Must be 'single-column'`, 'presentation.layout');
  }

  const spacing = assertStr(presObj.spacing, 'presentation.spacing', 16, 1);
  if (!['large', 'normal', 'compact'].includes(spacing)) {
    throw new ContractError(`Invalid presentation.spacing: '${spacing}'`, 'presentation.spacing');
  }

  const controls = assertStr(presObj.controls, 'presentation.controls', 16, 1);
  if (!['large', 'normal'].includes(controls)) {
    throw new ContractError(`Invalid presentation.controls: '${controls}'`, 'presentation.controls');
  }

  // Semantic check against original form if provided
  if (requestForm) {
    const expectedFieldIds = requestForm.fields.map(f => f.id);

    // 1. Every field in the request form must appear in sections exactly once
    if (flattenedFieldIds.length !== expectedFieldIds.length) {
      throw new ContractError(
        `Section field count (${flattenedFieldIds.length}) does not match request form field count (${expectedFieldIds.length})`,
        'sections'
      );
    }

    // 2. Exact preservation of original DOM order!
    for (let i = 0; i < expectedFieldIds.length; i++) {
      if (flattenedFieldIds[i] !== expectedFieldIds[i]) {
        throw new ContractError(
          `Field order altered at index ${i}: expected '${expectedFieldIds[i]}', got '${flattenedFieldIds[i]}'. DOM order must be preserved.`,
          'sections'
        );
      }
    }

    // 3. Block atomicity: fields in the same atomic block cannot span different sections
    for (const block of requestForm.blocks) {
      if (block.fieldIds.length > 1) {
        let blockSectionIndex = -1;
        for (let sIdx = 0; sIdx < parsedSections.length; sIdx++) {
          const s = parsedSections[sIdx];
          const hasAny = block.fieldIds.some(fid => s.fieldIds.includes(fid));
          const hasAll = block.fieldIds.every(fid => s.fieldIds.includes(fid));
          if (hasAny) {
            if (!hasAll) {
              throw new ContractError(
                `Atomic block '${block.id}' split across multiple sections`,
                'sections'
              );
            }
            if (blockSectionIndex !== -1 && blockSectionIndex !== sIdx) {
              throw new ContractError(
                `Atomic block '${block.id}' split across multiple sections`,
                'sections'
              );
            }
            blockSectionIndex = sIdx;
          }
        }
      }
    }
  }

  return {
    layoutVersion: 1,
    sections: parsedSections,
    presentation: {
      layout: 'single-column',
      spacing: spacing as 'large' | 'normal' | 'compact',
      controls: controls as 'large' | 'normal'
    }
  };
}
