/**
 * Form Detector for Adaptive Forms.
 * Identifies supported native forms and validates accessibility/security invariants.
 * Strictly excludes sensitive forms (passwords, payments) and dynamic iframes.
 */

export interface FormBlockInfo {
  blockId: string;
  containerEl: HTMLElement;
  elements: HTMLElement[];
  isRadioGroup?: boolean;
}

export interface FormDetectionResult {
  supported: boolean;
  reason?: string;
  formElement?: HTMLFormElement;
  blocks?: FormBlockInfo[];
}

const SENSITIVE_PATTERNS = [
  'password',
  'passwd',
  'credit-card',
  'creditcard',
  'cc-number',
  'cvv',
  'cvc',
  'ssn',
  'pin',
  'cardnumber'
];

export function isSensitiveElement(el: Element): boolean {
  const type = ((el as any).type || '').toLowerCase();
  if (type === 'password') {
    return true;
  }
  const inspectAttributes = [
    el.getAttribute('name'),
    el.getAttribute('id'),
    el.getAttribute('autocomplete'),
    el.getAttribute('aria-label'),
  ];
  for (const attr of inspectAttributes) {
    if (attr) {
      const lower = attr.toLowerCase().replace(/[\s_-]+/g, '');
      for (const kw of SENSITIVE_PATTERNS) {
        if (lower.includes(kw.replace(/[\s_-]+/g, ''))) {
          return true;
        }
      }
    }
  }
  return false;
}

export function detectSupportedForm(root: Document = document): FormDetectionResult {
  // Must be in top window
  if (window.self !== window.top) {
    return { supported: false, reason: 'Adaptive Forms only supports top-frame documents' };
  }

  const forms = Array.from(root.querySelectorAll('form'));
  if (forms.length === 0) {
    return { supported: false, reason: 'No HTML <form> element detected on page' };
  }
  if (forms.length > 1) {
    return { supported: false, reason: 'Multiple forms detected on page; select a single form' };
  }

  const form = forms[0];

  // Inspect form controls
  const inputs = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select'
    )
  );

  if (inputs.length === 0) {
    return { supported: false, reason: 'Form contains no interactive input controls' };
  }

  // Security check: reject if ANY sensitive input exists
  for (const input of inputs) {
    if (isSensitiveElement(input)) {
      return {
        supported: false,
        reason: 'Form contains sensitive authentication or financial controls (password/payment)',
      };
    }
  }

  // Check for file uploads or CAPTCHA
  for (const input of inputs) {
    if (input instanceof HTMLInputElement && input.type === 'file') {
      return { supported: false, reason: 'File upload controls are not currently supported' };
    }
  }

  // Group inputs into atomic blocks
  const blocks: FormBlockInfo[] = [];
  const processedInputs = new Set<HTMLElement>();
  let blockCounter = 1;

  // 1. Group fieldsets first
  const fieldsets = Array.from(form.querySelectorAll('fieldset'));
  for (const fs of fieldsets) {
    const fsInputs = Array.from(
      fs.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input, textarea, select'
      )
    ).filter(inp => inp.type !== 'submit' && inp.type !== 'button' && inp.type !== 'reset');

    if (fsInputs.length > 0) {
      blocks.push({
        blockId: `block-${blockCounter++}`,
        containerEl: fs,
        elements: fsInputs,
      });
      fsInputs.forEach(i => processedInputs.add(i));
    }
  }

  // 2. Group radio groups sharing the same name
  const radioGroups = new Map<string, HTMLInputElement[]>();
  for (const inp of inputs) {
    if (inp instanceof HTMLInputElement && inp.type === 'radio' && inp.name) {
      if (!processedInputs.has(inp)) {
        if (!radioGroups.has(inp.name)) {
          radioGroups.set(inp.name, []);
        }
        radioGroups.get(inp.name)!.push(inp);
      }
    }
  }

  for (const [_, radioInputs] of radioGroups.entries()) {
    // Find common container or use the parent of the first radio
    const commonContainer = (radioInputs[0].closest('.form-row, .form-group, .radio-group') ||
      radioInputs[0].parentElement) as HTMLElement;
    blocks.push({
      blockId: `block-${blockCounter++}`,
      containerEl: commonContainer,
      elements: radioInputs,
      isRadioGroup: true,
    });
    radioInputs.forEach(i => processedInputs.add(i));
  }

  // 3. Group remaining controls by their nearest .form-row / .form-group container
  for (const inp of inputs) {
    if (processedInputs.has(inp)) continue;
    if (inp.type === 'submit' || inp.type === 'button' || inp.type === 'reset' || inp.type === 'hidden') {
      continue;
    }

    const container = (inp.closest('.form-row, .form-group') || inp.parentElement) as HTMLElement;
    blocks.push({
      blockId: `block-${blockCounter++}`,
      containerEl: container,
      elements: [inp],
    });
    processedInputs.add(inp);
  }

  if (blocks.length === 0) {
    return { supported: false, reason: 'No eligible form blocks found' };
  }

  return {
    supported: true,
    formElement: form,
    blocks,
  };
}
