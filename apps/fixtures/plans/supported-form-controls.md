# Supported Form Controls Plan (`apps/fixtures/plans/supported-form-controls.md`)

**Owner:** Person 4 (Dedeepya)  
**Status:** Planned / Architecture Phase  

---

## 1. Purpose and Ownership

This document details the structure of the two primary independent form pages: `registration.html` and `enrollment.html`. These pages serve as the official evaluation platforms for SteadyHand's target discovery and interaction capabilities.

---

## 2. Form 1: Service Registration (`registration.html`)

A modern consumer web form testing standard single-column form inputs:

```html
<form id="registration-form">
  <h2>Create Your Account</h2>
  
  <div class="form-group">
    <label for="reg-name">Full Name</label>
    <input type="text" id="reg-name" name="name" required autocomplete="name" />
  </div>

  <div class="form-group">
    <label for="reg-email">Email Address</label>
    <input type="email" id="reg-email" name="email" required autocomplete="email" />
  </div>

  <fieldset class="form-group">
    <legend>Subscription Plan</legend>
    <label><input type="radio" name="plan" value="free" checked /> Community (Free)</label>
    <label><input type="radio" name="plan" value="pro" /> Professional ($12/mo)</label>
  </fieldset>

  <div class="form-group checkbox-group">
    <label>
      <input type="checkbox" id="reg-terms" required />
      I agree to the Terms of Service and Privacy Policy
    </label>
  </div>

  <div class="form-actions">
    <button type="button" id="reg-cancel">Cancel</button>
    <button type="submit" id="reg-submit">Register</button>
  </div>
</form>
```

### Key Verification Scenarios
- **Assisted Focus:** Hovering over `#reg-name` acquires candidate, executes dwell, and calls `focus()`. User can immediately type on physical keyboard.
- **Dwell Toggle:** Hovering over `#reg-terms` checkbox toggles checked state exactly once.
- **Associated Label Check:** Clicking or hovering over the `<label>` text must not trigger a double-click event that cancels the checkbox toggle.
- **Submit Protection:** `#reg-submit` is an implicit/explicit submit button; in P0, dwell is disabled on it (`dwellAllowed = false`). It requires a deliberate physical click.

---

## 3. Form 2: Course Enrollment (`enrollment.html`)

A dense, multi-column portal layout testing compact target clusters and textareas:

```html
<form id="enrollment-form">
  <h2>University Course Enrollment</h2>

  <div class="grid-2-col">
    <div class="form-group">
      <label for="enr-student-id">Student ID</label>
      <input type="text" id="enr-student-id" placeholder="8-digit ID" />
    </div>
    <div class="form-group">
      <label for="enr-term">Academic Term</label>
      <select id="enr-term">
        <option>Fall 2026</option>
        <option>Spring 2027</option>
      </select>
    </div>
  </div>

  <fieldset class="form-group">
    <legend>Select Electives (Compact Cluster)</legend>
    <div class="compact-grid">
      <label><input type="checkbox" name="course" value="cs101" /> CS 101: Systems</label>
      <label><input type="checkbox" name="course" value="cs102" /> CS 102: Algorithms</label>
      <label><input type="checkbox" name="course" value="math201" /> MATH 201: Linear Algebra</label>
      <label><input type="checkbox" name="course" value="phys101" /> PHYS 101: Mechanics</label>
    </div>
  </fieldset>

  <div class="form-group">
    <label for="enr-comments">Special Accommodation Requests</label>
    <textarea id="enr-comments" rows="4"></textarea>
  </div>
</form>
```

### Key Verification Scenarios
- **Dense Target Arbitration:** Adjacent course checkboxes (separated by only $8\text{ px}$) test `TargetArbitrator`'s capture radius and ambiguity margin.
- **Native Select Fallback:** Native `<select>` elements require native OS pickers; SteadyHand preserves normal user click paths without attempting synthetic menu rendering.
- **Textarea Focus:** Dwell focus on large `<textarea>` allows immediate multi-line text input.

---

## 4. Acceptance Criteria

- Forms submit cleanly via physical clicks.
- No SteadyHand-specific scripts, styles, or data attributes are present.
- Person 3’s extension discovers targets and enables dwell on all text inputs, textareas, checkboxes, and radio buttons.

---

## 5. Copy-Ready Implementation Prompt

```text
You are Person 4 (Dedeepya) creating supported form fixtures in apps/fixtures/.

Read apps/fixtures/plans/supported-form-controls.md.

ALLOWED EDITS:
- apps/fixtures/registration.html
- apps/fixtures/enrollment.html
- apps/fixtures/styles/fixture.css

TASK:
1. Implement registration.html with semantic inputs, radios, checkboxes, and buttons.
2. Implement enrollment.html with 2-column layout, dense checkboxes, native select, and textarea.
3. Apply clean, responsive styling in styles/fixture.css.
4. Verify standard browser form behavior without the extension.
```
