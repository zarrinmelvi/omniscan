# Terms Auto-Check & Dark Mode Overhaul — Bugfix Design

## Overview

Two targeted UI/UX fixes for the OmniScan Ionic Vue app.

**Fix 1** makes the Terms & Conditions checkbox in `RegisterPage.vue` a read-only state indicator. Currently the checkbox has `v-model="termsAccepted"` and `@change="termsError = false"`, which lets users toggle acceptance directly without reading the modal. The fix removes the two-way binding and suppresses pointer events on the checkbox element so only `acceptTerms()` and `disagreeTerms()` — called from the modal's action buttons — can change `termsAccepted`.

**Fix 2** adds additive dark-mode CSS rules to `dark-mode.css` (under the existing `html.ion-palette-dark` scope) for four components that still render hardcoded light-mode colours when dark mode is active: `RecipeDetailModal`, `ScanResultModal` (including its non-product `ion-alert`), `RecipeSuggestions`, and `HomePage`. No component `.vue` files are touched — all overrides live entirely in the global dark-mode stylesheet.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers defective behaviour — either a direct checkbox interaction that bypasses the modal flow (Fix 1), or a dark-mode-active state where a specific element still resolves a hardcoded light colour (Fix 2).
- **Property (P)**: The desired post-fix behaviour — checkbox is a passive indicator only (Fix 1); all listed elements render dark-appropriate tokens in dark mode (Fix 2).
- **Preservation**: Existing behaviours that must remain identical after the fix — modal accept/disagree flow, light-mode rendering, active-state overrides for storage and tab-chip accents.
- **`termsAccepted`**: Reactive `ref<boolean>` in `RegisterPage.vue` that gates form submission and reflects the checkbox state.
- **`acceptTerms()` / `disagreeTerms()`**: The only two functions that are authorised to mutate `termsAccepted`; called from "I Agree" and "I Disagree" buttons inside the Terms modal.
- **`html.ion-palette-dark`**: The CSS class toggled on `<html>` by `SettingsPage.vue` to activate dark mode; all dark-mode rules are scoped under this selector in `dark-mode.css`.
- **`--dm-*` tokens**: CSS custom properties declared in `dark-mode.css` that encode the dark-mode colour palette (`--dm-bg-card`, `--dm-border`, `--dm-text-primary`, etc.).

---

## Bug Details

### Bug Condition

**Fix 1** — The bug fires whenever the user directly clicks or taps the `<input type="checkbox" v-model="termsAccepted">` element. Because `v-model` creates a two-way binding, any direct click toggles `termsAccepted` — granting or revoking acceptance without modal interaction. The `@change="termsError = false"` handler also silently clears the error flag on every direct toggle.

**Formal Specification:**

```
FUNCTION isBugCondition_Fix1(event)
  INPUT: event of type UserInteraction
  OUTPUT: boolean

  RETURN event.target = termsCheckboxElement
         AND event.type IN ['click', 'change', 'input']
         AND event.source = DIRECT_USER_INTERACTION  // not dispatched by acceptTerms/disagreeTerms
END FUNCTION
```

**Fix 2** — The bug fires when dark mode is active and any of the listed elements resolves a hardcoded light value (white, near-white, or near-black) instead of a dark-mode token.

```
FUNCTION isBugCondition_Fix2(element, mode)
  INPUT: element of type DOMElement, mode of type ThemeMode
  OUTPUT: boolean

  RETURN mode = DARK
    AND element.class IN [
      'detail-container', 'detail-footer', 'green-chip', 'orange-chip',
      'step-text', 'section-label (inside .detail-content)',
      'sheet-ion-content', 'ingredients-card', 'ingredients-card__title',
      'ingredients-card__body', 'storage-btn', 'sheet-header',
      'product-title', 'product-subtitle', 'section-title (scan modal)',
      'alt-item__name', 'pantry-section', 'field-label',
      'alternatives-empty', 'non-product-alert',
      'recipe-card', 'tab-chip',
      'stat-value'
    ]
END FUNCTION
```

### Examples

**Fix 1:**
- User opens RegisterPage → taps checkbox directly → `termsAccepted` flips to `true` without opening the Terms modal → form can be submitted. **Expected:** nothing changes; checkbox is inert.
- User opens RegisterPage → clicks "I Agree" in modal → checkbox shows checked → taps checkbox again → `termsAccepted` flips to `false` silently. **Expected:** checkbox remains checked; only "I Disagree" can uncheck it.

**Fix 2:**
- Dark mode active → user opens RecipeDetailModal → `.detail-container` renders `background: #ffffff`. **Expected:** `background: var(--dm-bg-card)` (#1e293b).
- Dark mode active → user scans a product → `.sheet-ion-content` renders `--background: #ffffff`. **Expected:** `--background: var(--dm-bg-page)` (#0f172a).
- Dark mode active → user scans a non-product barcode → "Analysis Results" alert renders with a white card. **Expected:** alert uses `--background: var(--dm-bg-card)`.
- Dark mode active → HomePage `.stat-value` renders `color: #0f172a` (near-black). **Expected:** `color: var(--dm-text-primary, #f1f5f9) !important`.

---

## Expected Behavior

### Preservation Requirements

**Fix 1 — unchanged behaviours:**
- `acceptTerms()` continues to set `termsAccepted = true`, clear `termsError`, and close the modal.
- `disagreeTerms()` continues to set `termsAccepted = false`, set `termsError = true`, and close the modal.
- The "Terms & Conditions" text link continues to open the sheet modal.
- Form submission validation continues to block when `termsAccepted = false` with the same error message.
- The checkbox visually reflects the current `termsAccepted` state (`:checked` binding is preserved).

**Fix 2 — unchanged behaviours:**
- All existing `html.ion-palette-dark` rules already in `dark-mode.css` remain in effect.
- Light-mode rendering of all affected components is entirely unmodified (no `.vue` file changes).
- `.storage-btn--active` continues to render with its green accent (`background: #00b14f`).
- `.tab-chip--active-all`, `--active-liked`, `--active-made` retain their respective accent colours.
- The `.section-label` rule that already targets the Profile page (`html.ion-palette-dark .section-label { color: var(--dm-text-secondary) }`) is confirmed to apply to all `.section-label` elements globally; the new RecipeDetailModal scope is additive and does not conflict.

**Scope:** All inputs that do NOT match the bug conditions above shall be completely unaffected.

---

## Hypothesized Root Cause

### Fix 1

1. **Two-way binding on a read-only indicator**: `v-model="termsAccepted"` on the checkbox is the direct cause — Vue wires both `:checked` and a synthetic `change` listener that mutates `termsAccepted` on any user click. Removing `v-model` and using `:checked="termsAccepted"` (one-way) is sufficient to break the mutation path.

2. **Permissive `@change` handler**: The `@change="termsError = false"` handler compounds the problem by silently clearing the error state on direct toggle. It must be removed alongside `v-model`.

3. **No pointer suppression**: Even after removing `v-model`, the checkbox element remains clickable, which could confuse users who expect a response. Adding `pointer-events: none; cursor: default` via CSS makes the element visually and interactively inert to direct clicks.

### Fix 2

1. **Scoped `<style scoped>` overrides specificity**: Component scoped styles (compiled to `[data-v-xxxx]` attributes) have higher specificity than the global `html.ion-palette-dark .class-name` rules, causing light-mode values to win even when dark mode is active. Adding the exact class selectors under `html.ion-palette-dark` in `dark-mode.css` matches the same specificity level; because the global stylesheet is loaded after scoped bundles, cascade order ensures the dark-mode rule wins.

2. **Missing selectors for new components**: `RecipeDetailModal`, the ScanResultModal sheet and card elements, `RecipeSuggestions` tab chips, and `HomePage` stat values were simply never added to `dark-mode.css` when those components were built.

3. **`ion-alert` shadow DOM**: The non-product `ion-alert` background is controlled via a CSS custom property (`--background`) that must be targeted with `html.ion-palette-dark ion-alert.non-product-alert` — a standard Ionic pattern already used elsewhere in the file (e.g. `ion-alert.custom-make-alert`).

---

## Correctness Properties

Property 1: Bug Condition — Checkbox Is Inert to Direct Interaction

_For any_ `UserInteraction` event where `isBugCondition_Fix1(event)` returns true (i.e., the user directly clicks/taps the checkbox), the fixed `RegisterPage.vue` SHALL leave `termsAccepted` unchanged and produce no side effects — no state mutation, no error flag change, and no form submission.

**Validates: Requirements 1.1, 1.2**

Property 2: Preservation — Modal Accept/Disagree Flow Unchanged

_For any_ `UserInteraction` event where `isBugCondition_Fix1(event)` returns false (i.e., the user interacts via the Terms modal buttons or any other UI element), the fixed code SHALL produce exactly the same result as the original code: `acceptTerms()` sets `termsAccepted = true` and clears the error; `disagreeTerms()` sets `termsAccepted = false` and sets the error; the text link opens the modal; form submission blocks when unchecked.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

Property 3: Bug Condition — Dark Mode Elements Resolve Dark Tokens

_For any_ `DOMElement` where `isBugCondition_Fix2(element, DARK)` returns true, the fixed `dark-mode.css` SHALL cause that element to resolve a dark-appropriate CSS value (using `--dm-*` tokens or explicit dark hex values) for every affected property — `background`, `background-color`, `color`, `border-color`, `--background` — with no hardcoded white or near-black light-mode values remaining.

**Validates: Requirements 2.1–2.15**

Property 4: Preservation — Light Mode and Existing Dark Rules Unchanged

_For any_ `DOMElement` where `isBugCondition_Fix2(element, DARK)` returns false (light mode active, or element not in the affected class list), the fixed `dark-mode.css` SHALL produce exactly the same computed styles as before the fix, preserving all existing light-mode scoped styles and all pre-existing `html.ion-palette-dark` rules.

**Validates: Requirements 3.7, 3.8, 3.9, 3.10**

---

## Fix Implementation

### Fix 1 — `RegisterPage.vue`

**File:** `omniscan-ui/src/views/RegisterPage.vue`

**Specific Changes:**

1. **Remove `v-model` from the checkbox**: Replace `v-model="termsAccepted"` with `:checked="termsAccepted"` to make it a one-way read-only binding.

2. **Remove `@change` handler**: Delete `@change="termsError = false"` from the checkbox element — error clearing remains the responsibility of `acceptTerms()`.

3. **Suppress pointer events via CSS**: In the component's `<style scoped>` block, update `.terms-checkbox` to add `pointer-events: none; cursor: default;` so the element does not receive click events and the cursor does not suggest interactivity.

4. **No logic changes**: `acceptTerms()`, `disagreeTerms()`, the terms text link, and all form validation logic remain completely unchanged.

**Before (template):**
```html
<input
  v-model="termsAccepted"
  type="checkbox"
  class="terms-checkbox"
  @change="termsError = false" />
```

**After (template):**
```html
<input
  :checked="termsAccepted"
  type="checkbox"
  class="terms-checkbox" />
```

**Before (CSS):**
```css
.terms-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--ion-color-medium, #9ca3af);
  accent-color: #05c450;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 1px;
}
```

**After (CSS):**
```css
.terms-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--ion-color-medium, #9ca3af);
  accent-color: #05c450;
  cursor: default;
  pointer-events: none;
  flex-shrink: 0;
  margin-top: 1px;
}
```

---

### Fix 2 — `dark-mode.css`

**File:** `omniscan-ui/src/theme/dark-mode.css`

All rules are additive — appended to the end of the existing file. No existing rules are modified or removed.

**RecipeDetailModal:**
```css
html.ion-palette-dark .detail-container,
html.ion-palette-dark .detail-footer {
  background: var(--dm-bg-card);
  border-color: var(--dm-border);
}
html.ion-palette-dark .green-chip {
  background: #14532d;
  color: #86efac;
}
html.ion-palette-dark .orange-chip {
  background: #431407;
  color: #fed7aa;
}
html.ion-palette-dark .step-text {
  color: var(--dm-text-secondary);
}
html.ion-palette-dark .detail-content .section-label {
  color: var(--dm-text-secondary);
}
```

Note: `.section-label` is scoped to `.detail-content` to avoid conflicting with the existing global `.section-label` rule (Profile page) which already covers it — the extra specificity is intentional and harmless.

**ScanResultModal:**
```css
html.ion-palette-dark .sheet-ion-content {
  --background: var(--dm-bg-page);
}
html.ion-palette-dark .ingredients-card {
  background: var(--dm-bg-subtle);
  border-color: var(--dm-border);
}
html.ion-palette-dark .ingredients-card__title {
  color: var(--dm-text-primary);
}
html.ion-palette-dark .ingredients-card__body {
  color: var(--dm-text-secondary);
}
html.ion-palette-dark .storage-btn {
  background: var(--dm-bg-chip);
  border-color: var(--dm-border);
  color: var(--dm-text-primary);
}
html.ion-palette-dark .sheet-header {
  border-bottom-color: var(--dm-border);
}
html.ion-palette-dark .product-title {
  color: var(--dm-text-primary);
}
html.ion-palette-dark .product-subtitle {
  color: var(--dm-text-secondary);
}
html.ion-palette-dark .section-title {
  color: var(--dm-text-primary);
}
html.ion-palette-dark .alt-item__name {
  color: var(--dm-text-primary);
}
html.ion-palette-dark .pantry-section {
  border-top-color: var(--dm-border);
}
html.ion-palette-dark .field-label {
  color: var(--dm-text-secondary);
}
html.ion-palette-dark .alternatives-empty {
  color: var(--dm-text-secondary);
}
html.ion-palette-dark ion-alert.non-product-alert {
  --background: var(--dm-bg-card);
}
```

Note: `.section-title` already appears in the existing dark-mode rules (`html.ion-palette-dark .section-title { color: var(--dm-text-primary) }`). The existing rule is confirmed sufficient — no duplicate needed. The ScanResultModal fix only requires it if the component's scoped style overrides specificity; if the existing rule already wins, no addition is necessary. This will be confirmed during exploratory testing.

**RecipeSuggestions:**
```css
html.ion-palette-dark .recipe-card {
  background: var(--dm-bg-card);
  border-color: var(--dm-border);
}
html.ion-palette-dark .tab-chip {
  background: var(--dm-bg-chip);
  color: var(--dm-text-primary);
}
```

Note: `.recipe-card` already exists in the Cards and surface containers block. The existing rule already covers it — confirmed sufficient. The `.tab-chip` rule is new.

**HomePage:**
```css
html.ion-palette-dark .stat-value {
  color: var(--dm-text-primary, #f1f5f9) !important;
}
```

The `!important` is required because `HomePage.vue`'s scoped style for `.stat-value` uses `color: #0f172a` which outspecifies the global selector without it.

---

## Testing Strategy

### Validation Approach

Testing follows the two-phase bug condition methodology: first run exploratory tests on **unfixed** code to surface counterexamples and confirm root cause hypotheses, then verify the fix and preservation with targeted tests on the **fixed** code.

---

### Exploratory Bug Condition Checking

**Goal**: Demonstrate the bugs on unfixed code. Confirm or refute root cause hypotheses. If refuted, re-hypothesize before implementing the fix.

**Fix 1 — Test Plan**: Mount `RegisterPage.vue` with `termsAccepted = false`. Programmatically fire a `click` event on the checkbox element. Assert `termsAccepted` has changed (demonstrating the bug).

**Fix 1 — Test Cases:**
1. **Direct checkbox click** — Fire `click` on `.terms-checkbox` with `termsAccepted = false`. Will observe: `termsAccepted` becomes `true`. Expected counterexample confirmed.
2. **Direct checkbox uncheck** — Fire `click` on `.terms-checkbox` with `termsAccepted = true`. Will observe: `termsAccepted` becomes `false` silently without triggering error. Expected counterexample confirmed.
3. **Error flag cleared on direct click** — With `termsError = true`, fire `change` event. Will observe: `termsError` becomes `false` without modal interaction.

**Fix 2 — Test Plan**: Render each affected component in dark mode (apply `ion-palette-dark` to `<html>`) and assert computed styles.

**Fix 2 — Test Cases:**
1. **RecipeDetailModal backgrounds** — Assert `.detail-container` and `.detail-footer` have `background !== '#ffffff'` in dark mode. Will observe: `#ffffff` (confirming bug).
2. **Chip colours** — Assert `.green-chip` and `.orange-chip` text colors are not `#166534` / `#9a3412`. Will observe: light-mode values (confirming bug).
3. **ScanResultModal sheet** — Assert `.sheet-ion-content` `--background` custom property is not `#ffffff`. Will observe: `#ffffff` (confirming bug).
4. **Stat value** — Assert `.stat-value` `color` is not `#0f172a` in dark mode. Will observe: near-black (confirming bug).

**Expected Counterexamples:**
- `termsAccepted` mutates on direct checkbox interaction (Fix 1).
- Computed `background` / `color` values on affected elements remain light-mode values when `ion-palette-dark` is active (Fix 2).

---

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behaviour.

**Pseudocode:**
```
// Fix 1
FOR ALL event WHERE isBugCondition_Fix1(event) DO
  stateBefore ← termsAccepted
  dispatchEvent(termsCheckboxElement, event)
  ASSERT termsAccepted = stateBefore  // no mutation
  ASSERT termsError UNCHANGED
END FOR

// Fix 2
FOR ALL element WHERE isBugCondition_Fix2(element, DARK) DO
  styles ← getComputedStyle(element)
  ASSERT styles do NOT contain ['#ffffff', '#f8fafc', '#f3f4f6', '#374151', '#0f172a']
  ASSERT styles CONTAIN expected dm-token value
END FOR
```

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original.

**Pseudocode:**
```
// Fix 1
FOR ALL interaction WHERE NOT isBugCondition_Fix1(interaction) DO
  ASSERT acceptTerms_fixed()   = acceptTerms_original()
  ASSERT disagreeTerms_fixed() = disagreeTerms_original()
  ASSERT termsLinkClick_fixed()  opens modal (same as original)
  ASSERT formSubmit_fixed(termsAccepted=false) = formSubmit_original(termsAccepted=false)
END FOR

// Fix 2
FOR ALL element WHERE NOT isBugCondition_Fix2(element, mode) DO
  ASSERT computedStyles_fixed(element, LIGHT) = computedStyles_original(element, LIGHT)
  ASSERT computedStyles_fixed(element, DARK, excludedClass) = computedStyles_original(element, DARK, excludedClass)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation because it generates a wide range of interaction sequences and theme states automatically, surfacing regressions that hand-written unit tests might miss.

**Fix 1 — Preservation Test Cases:**
1. **Accept via modal** — Call `acceptTerms()` → assert `termsAccepted = true`, `termsError = false`, `isTermsOpen = false`.
2. **Disagree via modal** — Call `disagreeTerms()` → assert `termsAccepted = false`, `termsError = true`, `isTermsOpen = false`.
3. **Terms link click** — Trigger the `.terms-link` button → assert `isTermsOpen = true`.
4. **Form submit without agreement** — Submit form with `termsAccepted = false` → assert `termsError = true` and navigation does not proceed.

**Fix 2 — Preservation Test Cases:**
1. **Light mode styles unchanged** — Render each affected component in light mode → assert all existing scoped styles resolve unchanged.
2. **Storage-btn active state** — In dark mode, apply `.storage-btn--active` → assert `background: #00b14f` wins (active accent preserved).
3. **Tab-chip active states** — In dark mode, apply `--active-all`, `--active-liked`, `--active-made` → assert respective accent colours are preserved.
4. **Existing dark-mode rules unaffected** — Spot-check 5 existing `html.ion-palette-dark` rules (e.g. `.pantry-card`, `.auth-card`, `.header-container`) → assert computed values unchanged after appending new rules.

---

### Unit Tests

- Test that direct `click` on `.terms-checkbox` does not change `termsAccepted` in the fixed component.
- Test that `acceptTerms()` and `disagreeTerms()` produce the correct state transitions post-fix.
- Test that CSS `pointer-events: none` is present on `.terms-checkbox` in the fixed scoped styles.
- Test each new dark-mode CSS rule resolves the correct token value for a given element class.
- Test that `.storage-btn--active` retains its green background in dark mode (specificity check).

### Property-Based Tests

- Generate random sequences of checkbox click events on the fixed component → assert `termsAccepted` never changes via direct interaction across all sequences.
- Generate random combinations of `termsAccepted` initial state + modal button presses → assert state always matches the modal button pressed (not any checkbox click).
- Generate random sets of CSS class combinations on dark-mode elements → assert no affected element resolves a hardcoded light-mode value.
- Generate random non-affected dark-mode element classes → assert computed styles match original dark-mode rules (preservation).

### Integration Tests

- Full registration flow: reach Register page → submit without terms → verify error → open modal → click "I Agree" → verify checkbox checked → submit successfully.
- Full dark mode toggle: enable dark mode in Settings → navigate to RecipeDetailModal, ScanResultModal, RecipeSuggestions, and HomePage → visually and computationally confirm each affected element uses dark tokens.
- Regression: open `RecipeDetailModal` in light mode → verify containers still render white; open in dark mode → verify dark tokens.
- Regression: verify `.tab-chip--active-*` accent colours are visually correct in both light and dark mode after the fix.
