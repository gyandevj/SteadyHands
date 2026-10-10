import test from 'node:test';
import assert from 'node:assert';
import { classifyElement } from '../../apps/extension/src/content/policy.ts';

test('Policy: classifies standard input types correctly', () => {
  // Mock element structure
  const makeMockInput = (type: string, disabled = false) => {
    return {
      tagName: 'INPUT',
      type,
      isConnected: true,
      closest: () => null,
      hasAttribute: (attr: string) => attr === 'disabled' && disabled,
      getAttribute: (attr: string) => (attr === 'disabled' && disabled ? 'true' : null)
    } as unknown as Element;
  };

  // Text inputs: eligible, focus, dwell allowed
  const textInput = makeMockInput('text');
  // Need window.getComputedStyle mock
  (global as any).window = {
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' })
  };

  const resText = classifyElement(textInput);
  assert.strictEqual(resText.eligible, true);
  assert.strictEqual(resText.kind, 'focus');
  assert.strictEqual(resText.dwellAllowed, true);

  // Checkbox: eligible, toggle, dwell allowed
  const checkbox = makeMockInput('checkbox');
  const resCheck = classifyElement(checkbox);
  assert.strictEqual(resCheck.eligible, true);
  assert.strictEqual(resCheck.kind, 'toggle');
  assert.strictEqual(resCheck.dwellAllowed, true);

  // Submit button: eligible for assisted click, but dwellAllowed=false!
  const submitInput = makeMockInput('submit');
  const resSubmit = classifyElement(submitInput);
  assert.strictEqual(resSubmit.eligible, true);
  assert.strictEqual(resSubmit.kind, 'button');
  assert.strictEqual(resSubmit.dwellAllowed, false);

  // Disabled input: ineligible
  const disabledInput = makeMockInput('text', true);
  const resDisabled = classifyElement(disabledInput);
  assert.strictEqual(resDisabled.eligible, false);
});
