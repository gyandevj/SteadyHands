import test from 'node:test';
import assert from 'node:assert';
import { isSensitiveElement } from '../../apps/extension/src/content/adaptiveForms/detector.ts';
import { MutationJournal } from '../../apps/extension/src/content/adaptiveForms/mutationJournal.ts';
import { extractSanitizedFormData } from '../../apps/extension/src/content/adaptiveForms/extractor.ts';
import { renderAdaptiveLayout } from '../../apps/extension/src/content/adaptiveForms/renderer.ts';
import type { AdaptiveLayoutProposal } from '../../apps/extension/src/types/index.ts';

test('Adaptive Forms: sensitive input detection gate', () => {
  const makeMockInput = (type: string, name = '', id = '') => {
    return {
      tagName: 'INPUT',
      type,
      getAttribute: (attr: string) => {
        if (attr === 'name') return name;
        if (attr === 'id') return id;
        return null;
      }
    } as unknown as HTMLInputElement;
  };

  // 1. Password input must be sensitive
  const pwdInput = makeMockInput('password', 'user_pass', 'pwd');
  assert.strictEqual(isSensitiveElement(pwdInput), true);

  // 2. Credit card named input must be sensitive
  const ccInput = makeMockInput('text', 'credit_card_number', 'cc');
  assert.strictEqual(isSensitiveElement(ccInput), true);

  // 3. Normal text input must NOT be sensitive
  const normalInput = makeMockInput('text', 'nickname', 'input-nickname');
  assert.strictEqual(isSensitiveElement(normalInput), false);
});

test('Adaptive Forms: mutation journal records and cleanly reverses presentation', () => {
  const journal = new MutationJournal();

  // Create mock DOM structure
  const parent = {
    children: [] as any[],
    removeChild(node: any) {
      this.children = this.children.filter((c: any) => c !== node);
    }
  } as unknown as Node;

  const addedEl = {
    parentNode: parent,
  } as unknown as Node;
  (parent as any).children.push(addedEl);

  const styledEl = {
    classList: {
      classes: new Set<string>(),
      add(c: string) { this.classes.add(c); },
      remove(c: string) { this.classes.delete(c); },
      contains(c: string) { return this.classes.has(c); }
    }
  } as unknown as Element;

  // Record additions
  journal.recordAddedNode(addedEl, parent);
  journal.recordAddedClass(styledEl, 'steadyhand-adapted-form');

  assert.strictEqual(journal.isModified, true);
  assert.strictEqual((styledEl as any).classList.contains('steadyhand-adapted-form'), true);
  assert.strictEqual((parent as any).children.length, 1);

  // Restore
  journal.restore();

  assert.strictEqual(journal.isModified, false);
  assert.strictEqual((styledEl as any).classList.contains('steadyhand-adapted-form'), false);
  assert.strictEqual((parent as any).children.length, 0);
});

test('Adaptive Forms: extractor outputs sanitized aliases without entered values', () => {
  // Set up mock document
  (global as any).document = {
    querySelector: () => null,
  };

  const form = {
    id: 'test-form',
  } as unknown as HTMLFormElement;

  const input1 = {
    tagName: 'INPUT',
    type: 'text',
    name: 'nickname',
    value: 'SENSITIVE_USER_ENTERED_VALUE_XYZ',
    required: true,
    closest: () => null,
    parentElement: null,
    getAttribute: (attr: string) => (attr === 'name' ? 'nickname' : null),
  } as unknown as HTMLInputElement;

  const radio1 = {
    tagName: 'INPUT',
    type: 'radio',
    name: 'workshop',
    value: 'drawing',
    checked: true,
    required: true,
    closest: () => null,
    parentElement: null,
    getAttribute: (attr: string) => (attr === 'name' ? 'workshop' : null),
  } as unknown as HTMLInputElement;

  const radio2 = {
    tagName: 'INPUT',
    type: 'radio',
    name: 'workshop',
    value: 'gardening',
    checked: false,
    required: true,
    closest: () => null,
    parentElement: null,
    getAttribute: (attr: string) => (attr === 'name' ? 'workshop' : null),
  } as unknown as HTMLInputElement;

  const blocks = [
    {
      blockId: 'block-1',
      containerEl: { closest: () => null, parentElement: null } as any,
      elements: [input1],
    },
    {
      blockId: 'block-2',
      containerEl: { closest: () => null, parentElement: null } as any,
      elements: [radio1, radio2],
      isRadioGroup: true,
    },
  ];

  const extracted = extractSanitizedFormData(form, blocks);

  // 1. Check fields
  assert.strictEqual(extracted.data.fields.length, 2);
  assert.strictEqual(extracted.data.fields[0].id, 'field-1');
  assert.strictEqual(extracted.data.fields[0].type, 'text');
  assert.strictEqual(extracted.data.fields[1].id, 'field-2');
  assert.strictEqual(extracted.data.fields[1].type, 'radio');
  assert.strictEqual(extracted.data.fields[1].options?.length, 2);

  // 2. CRITICAL: Sentinel value must NEVER appear anywhere in the extracted JSON!
  const serialized = JSON.stringify(extracted.data);
  assert.strictEqual(serialized.includes('SENSITIVE_USER_ENTERED_VALUE_XYZ'), false);
  assert.strictEqual(serialized.includes('drawing'), false);
  assert.strictEqual(serialized.includes('gardening'), false);
});
