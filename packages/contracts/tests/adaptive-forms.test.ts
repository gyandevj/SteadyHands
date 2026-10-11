import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  validateAdaptiveFormPlanRequest,
  validateAdaptiveLayoutProposal,
  ContractError,
  type AdaptiveFormPlanRequest,
  type AdaptiveLayoutProposal,
} from '../src/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const examplesDir = join(__dirname, '..', 'examples');

function loadJson(filename: string): unknown {
  return JSON.parse(readFileSync(join(examplesDir, filename), 'utf-8'));
}

describe('Adaptive Forms Contracts Validation', () => {
  it('parses canonical adaptive-form.json successfully', () => {
    const raw = loadJson('adaptive-form.json');
    const req = validateAdaptiveFormPlanRequest(raw);
    assert.equal(req.v, 1);
    assert.equal(req.requestId, 'req-canonical-001');
    assert.equal(req.form.formId, 'form-workshop-preferences');
    assert.equal(req.form.fields.length, 5);
    assert.equal(req.form.fields[0].id, 'field-1');
    assert.equal(req.form.fields[0].type, 'text');
    assert.equal(req.form.fields[2].type, 'radio');
    assert.equal(req.form.fields[2].options?.length, 3);
    assert.equal(req.form.blocks.length, 5);
  });

  it('parses canonical adaptive-layout.json successfully and validates against canonical form', () => {
    const req = validateAdaptiveFormPlanRequest(loadJson('adaptive-form.json'));
    const raw = loadJson('adaptive-layout.json');
    const proposal = validateAdaptiveLayoutProposal(raw, req.form);
    assert.equal(proposal.layoutVersion, 1);
    assert.equal(proposal.sections.length, 3);
    assert.equal(proposal.sections[0].title, 'Your Profile');
    assert.deepEqual(proposal.sections[0].fieldIds, ['field-1', 'field-2']);
    assert.equal(proposal.presentation.layout, 'single-column');
    assert.equal(proposal.presentation.spacing, 'large');
    assert.equal(proposal.presentation.controls, 'large');
  });

  it('rejects adaptive form request with extraneous properties', () => {
    const raw = loadJson('adaptive-form.json') as Record<string, unknown>;
    const mutated = { ...raw, injectedProperty: 'malicious' };
    assert.throws(() => {
      validateAdaptiveFormPlanRequest(mutated);
    }, (err: unknown) => {
      assert.ok(err instanceof ContractError);
      return true;
    });
  });

  it('rejects adaptive form request with sensitive keywords in labels', () => {
    const raw = JSON.parse(JSON.stringify(loadJson('adaptive-form.json'))) as AdaptiveFormPlanRequest;
    (raw.form.fields[0] as any).label = 'Enter your password here';
    assert.throws(() => {
      validateAdaptiveFormPlanRequest(raw);
    }, (err: unknown) => {
      assert.ok(err instanceof ContractError);
      assert.match((err as Error).message, /Sensitive field detected/);
      return true;
    });
  });

  it('rejects adaptive form request with duplicate field IDs', () => {
    const raw = JSON.parse(JSON.stringify(loadJson('adaptive-form.json'))) as AdaptiveFormPlanRequest;
    (raw.form.fields[1] as any).id = 'field-1';
    assert.throws(() => {
      validateAdaptiveFormPlanRequest(raw);
    }, (err: unknown) => {
      assert.ok(err instanceof ContractError);
      assert.match((err as Error).message, /Duplicate field ID/);
      return true;
    });
  });

  it('rejects proposal that alters DOM field order', () => {
    const req = validateAdaptiveFormPlanRequest(loadJson('adaptive-form.json'));
    const raw = JSON.parse(JSON.stringify(loadJson('adaptive-layout.json'))) as AdaptiveLayoutProposal;
    // Reverse field order in section 0
    (raw.sections[0] as any).fieldIds = ['field-2', 'field-1'];
    assert.throws(() => {
      validateAdaptiveLayoutProposal(raw, req.form);
    }, (err: unknown) => {
      assert.ok(err instanceof ContractError);
      assert.match((err as Error).message, /Field order altered/);
      return true;
    });
  });

  it('rejects proposal that omits a form field', () => {
    const req = validateAdaptiveFormPlanRequest(loadJson('adaptive-form.json'));
    const raw = JSON.parse(JSON.stringify(loadJson('adaptive-layout.json'))) as AdaptiveLayoutProposal;
    // Omit field-5
    (raw.sections[2] as any).fieldIds = ['field-4'];
    assert.throws(() => {
      validateAdaptiveLayoutProposal(raw, req.form);
    }, (err: unknown) => {
      assert.ok(err instanceof ContractError);
      assert.match((err as Error).message, /Section field count/);
      return true;
    });
  });

  it('rejects proposal that splits an atomic block across sections', () => {
    const req = validateAdaptiveFormPlanRequest(loadJson('adaptive-form.json'));
    // Make block-1 atomic containing field-1 and field-3
    const mutatedForm = {
      ...req.form,
      blocks: [
        { id: 'block-multi', fieldIds: ['field-1', 'field-3'] },
        { id: 'block-2', fieldIds: ['field-2'] },
        { id: 'block-4', fieldIds: ['field-4'] },
        { id: 'block-5', fieldIds: ['field-5'] }
      ]
    };
    const raw = loadJson('adaptive-layout.json');
    // In canonical layout, field-1 is in Section 0 and field-3 is in Section 1!
    assert.throws(() => {
      validateAdaptiveLayoutProposal(raw, mutatedForm);
    }, (err: unknown) => {
      assert.ok(err instanceof ContractError);
      assert.match((err as Error).message, /Atomic block .* split across/);
      return true;
    });
  });

  it('rejects proposal with invalid presentation parameters', () => {
    const raw = JSON.parse(JSON.stringify(loadJson('adaptive-layout.json'))) as AdaptiveLayoutProposal;
    (raw.presentation as any).layout = 'two-column';
    assert.throws(() => {
      validateAdaptiveLayoutProposal(raw);
    }, (err: unknown) => {
      assert.ok(err instanceof ContractError);
      assert.match((err as Error).message, /Must be 'single-column'/);
      return true;
    });
  });

  it('rejects proposal exceeding maximum section count (>6)', () => {
    const raw = JSON.parse(JSON.stringify(loadJson('adaptive-layout.json'))) as AdaptiveLayoutProposal;
    (raw as any).sections = [
      { title: 'S1', fieldIds: ['f1'] },
      { title: 'S2', fieldIds: ['f2'] },
      { title: 'S3', fieldIds: ['f3'] },
      { title: 'S4', fieldIds: ['f4'] },
      { title: 'S5', fieldIds: ['f5'] },
      { title: 'S6', fieldIds: ['f6'] },
      { title: 'S7', fieldIds: ['f7'] },
    ];
    assert.throws(() => {
      validateAdaptiveLayoutProposal(raw);
    }, (err: unknown) => {
      assert.ok(err instanceof ContractError);
      assert.match((err as Error).message, /exceeds maximum 6/);
      return true;
    });
  });
});
