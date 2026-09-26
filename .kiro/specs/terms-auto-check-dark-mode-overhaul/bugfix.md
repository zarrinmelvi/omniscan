# Bugfix Requirements Document

## Introduction

Two UI/UX refinements for the OmniScan Ionic Vue app. Fix 1 removes the ability to manually toggle the Terms & Conditions checkbox in `RegisterPage.vue` — acceptance is only granted via the modal's "I Agree" button, making the checkbox a read-only state indicator. Fix 2 adds comprehensive dark mode overrides in `dark-mode.css` for five components whose hardcoded light-mode colors remain visible when `html.ion-palette-dark` is active: `RecipeDetailModal.vue`, `ScanResultModal.vue` (including its non-product `ion-alert`), `RecipeSuggestions.vue`, and `HomePage.vue`.

---

## Bug Analysis

### Current Behavior (Defect)

**Fix 1 — Terms & Conditions checkbox (RegisterPage.vue)**

1.1 WHEN the user directly taps or clicks the Terms & Conditions checkbox THEN the system toggles `termsAccepted` to `true`, bypassing the requirement to read the modal

1.2 WHEN the user directly untaps the Terms & Conditions checkbox after it has been checked THEN the system sets `termsAccepted` to `false` via the `@change` handler, which conflicts with the intent that agreement can only be granted through the modal

**Fix 2a — RecipeDetailModal dark mode**

2.1 WHEN dark mode is active and `RecipeDetailModal` is open THEN the system renders `.detail-container` and `.detail-footer` with a hardcoded `background: #ffffff`, showing a white surface against the dark background

2.2 WHEN dark mode is active and `RecipeDetailModal` is open THEN the system renders `.green-chip` with `background: #f0fdf4; color: #166534` (light-mode palette), making matched ingredient chips illegible on dark surfaces

2.3 WHEN dark mode is active and `RecipeDetailModal` is open THEN the system renders `.orange-chip` with `background: #fff7ed; color: #9a3412` (light-mode palette), making missing ingredient chips illegible on dark surfaces

2.4 WHEN dark mode is active and `RecipeDetailModal` is open THEN the system renders `.step-text` with `color: #374151` (near-black), making instruction text too dark to read on dark backgrounds

2.5 WHEN dark mode is active and `RecipeDetailModal` is open THEN the system renders `.section-label` with `color: #374151` (near-black), making section headings too dark to read on dark backgrounds

**Fix 2b — ScanResultModal dark mode**

2.6 WHEN dark mode is active and `ScanResultModal` is open for a product THEN the system renders `.sheet-ion-content` with `--background: #ffffff`, showing a white sheet against the dark UI

2.7 WHEN dark mode is active and `ScanResultModal` is open THEN the system renders `.ingredients-card` with `background: #f8fafc`, showing a near-white card surface in dark mode

2.8 WHEN dark mode is active and `ScanResultModal` is open THEN the system renders `.storage-btn` with `background: #fff`, showing white storage location buttons in dark mode

2.9 WHEN dark mode is active and `ScanResultModal` is open THEN the system renders `.quantity-input` and `.unit-select` with `background-color: #ffffff !important`, overriding any inherited dark styles with a white input background

2.10 WHEN dark mode is active and `ScanResultModal` is open THEN the system renders `.date-input` with `background-color: #ffffff !important`, overriding any inherited dark styles with a white date field

**Fix 2c — ScanResultModal non-product ion-alert**

2.11 WHEN dark mode is active and a non-product scan result triggers the "Analysis Results" `ion-alert` THEN the system displays the alert card with a white/light background, creating a jarring white card on the dark background

**Fix 2d — RecipeSuggestions dark mode**

2.12 WHEN dark mode is active and `RecipeSuggestions` is open THEN the system renders `.recipe-card` with `background: #ffffff`, showing white recipe cards against a dark page

2.13 WHEN dark mode is active and `RecipeSuggestions` is open THEN the system renders `.header-container` with `background: #ffffff`, showing a white sticky header in the dark UI (the existing `.header-container` rule in `dark-mode.css` targets `var(--dm-header-bg)` globally but the scoped `#ffffff` override in RecipeSuggestions takes precedence)

2.14 WHEN dark mode is active and `RecipeSuggestions` is open THEN the system renders `.tab-chip` with `background: #f3f4f6; color: #4b5563` (light-mode palette), making the tab filter chips look washed-out

**Fix 2e — HomePage stat-value**

2.15 WHEN dark mode is active on `HomePage` THEN the system renders `.stat-value` with `color: #0f172a` (near-black) and no dark-mode override exists in `dark-mode.css`, making the pantry and expiring-soon stat numbers illegible on dark stat cards

---

### Expected Behavior (Correct)

**Fix 1 — Terms & Conditions checkbox (RegisterPage.vue)**

1.1 WHEN the user directly taps or clicks the Terms & Conditions checkbox THEN the system SHALL ignore the interaction — the checkbox state SHALL NOT change via direct user click

1.2 WHEN the user taps "I Agree" in the Terms & Conditions modal THEN the system SHALL set `termsAccepted = true`, close the modal, and the checkbox SHALL reflect the checked state as a read-only indicator

1.3 WHEN the user taps "I Disagree" in the Terms & Conditions modal THEN the system SHALL set `termsAccepted = false`, close the modal, and the checkbox SHALL remain unchecked

**Fix 2a — RecipeDetailModal dark mode**

2.1 WHEN dark mode is active and `RecipeDetailModal` is open THEN the system SHALL render `.detail-container` and `.detail-footer` with `background: var(--dm-bg-card)` so they blend with the dark UI surface

2.2 WHEN dark mode is active and `RecipeDetailModal` is open THEN the system SHALL render `.green-chip` with a dark-appropriate green background (e.g. `#14532d`) and a light green text color (e.g. `#86efac`) for legible matched ingredient chips

2.3 WHEN dark mode is active and `RecipeDetailModal` is open THEN the system SHALL render `.orange-chip` with a dark-appropriate orange background (e.g. `#431407`) and a light orange text color (e.g. `#fed7aa`) for legible missing ingredient chips

2.4 WHEN dark mode is active and `RecipeDetailModal` is open THEN the system SHALL render `.step-text` with `color: var(--dm-text-secondary)` so instruction text is readable against dark backgrounds

2.5 WHEN dark mode is active and `RecipeDetailModal` is open THEN the system SHALL render `.section-label` with `color: var(--dm-text-secondary)` so section headings are readable against dark backgrounds

**Fix 2b — ScanResultModal dark mode**

2.6 WHEN dark mode is active and `ScanResultModal` is open THEN the system SHALL override `.sheet-ion-content` so `--background` resolves to `var(--dm-bg-page)` instead of `#ffffff`

2.7 WHEN dark mode is active and `ScanResultModal` is open THEN the system SHALL render `.ingredients-card` with `background: var(--dm-bg-subtle)` and a dark-appropriate border color

2.8 WHEN dark mode is active and `ScanResultModal` is open THEN the system SHALL render `.storage-btn` with `background: var(--dm-bg-chip)` and appropriate text/border colors

2.9 WHEN dark mode is active and `ScanResultModal` is open THEN the system SHALL render `.quantity-input` and `.unit-select` with `background-color: var(--dm-bg-input) !important` and `color: var(--dm-text-input) !important` to override the hardcoded white backgrounds

2.10 WHEN dark mode is active and `ScanResultModal` is open THEN the system SHALL render `.date-input` with `background-color: var(--dm-bg-input) !important` and `color: var(--dm-text-input) !important` to override the hardcoded white background

**Fix 2c — ScanResultModal non-product ion-alert**

2.11 WHEN dark mode is active and a non-product scan result triggers the "Analysis Results" `ion-alert` THEN the system SHALL render the alert with `--background: var(--dm-bg-card)` and dark-appropriate title/message text colors

**Fix 2d — RecipeSuggestions dark mode**

2.12 WHEN dark mode is active and `RecipeSuggestions` is open THEN the system SHALL render `.recipe-card` with `background: var(--dm-bg-card)` and a dark border color

2.13 WHEN dark mode is active and `RecipeSuggestions` is open THEN the system SHALL render `.header-container` to use `var(--dm-header-bg)` — the existing global rule SHALL be confirmed sufficient or a scoped override added to ensure the RecipeSuggestions `#ffffff` scoped style is overridden

2.14 WHEN dark mode is active and `RecipeSuggestions` is open THEN the system SHALL render `.tab-chip` with `background: var(--dm-bg-chip)` and `color: var(--dm-text-primary)` for legible tab filter chips

**Fix 2e — HomePage stat-value**

2.15 WHEN dark mode is active on `HomePage` THEN the system SHALL render `.stat-value` with `color: var(--dm-text-primary)` so pantry and expiring-soon stat numbers are clearly legible on dark stat cards

---

### Unchanged Behavior (Regression Prevention)

**Fix 1 — Terms & Conditions checkbox (RegisterPage.vue)**

3.1 WHEN the user is in light mode on the Register page THEN the system SHALL CONTINUE TO display the terms checkbox row as a visual state indicator

3.2 WHEN the user has not yet opened the Terms modal THEN the system SHALL CONTINUE TO show the checkbox unchecked and block form submission with the same "Please accept the Terms & Conditions to continue." error

3.3 WHEN the user taps the "Terms & Conditions" text link THEN the system SHALL CONTINUE TO open the Terms & Conditions sheet modal

3.4 WHEN the user taps "I Agree" THEN the system SHALL CONTINUE TO set `termsAccepted = true`, clear `termsError`, and close the modal (existing `acceptTerms()` function behavior is preserved)

3.5 WHEN the user taps "I Disagree" THEN the system SHALL CONTINUE TO set `termsAccepted = false`, set `termsError = true`, and close the modal (existing `disagreeTerms()` function behavior is preserved)

3.6 WHEN the user submits the registration form with `termsAccepted = true` THEN the system SHALL CONTINUE TO proceed with account creation validation

**Fix 2 — Dark mode overrides (dark-mode.css)**

3.7 WHEN dark mode is NOT active THEN the system SHALL CONTINUE TO render all affected components (RecipeDetailModal, ScanResultModal, RecipeSuggestions, HomePage) with their existing light-mode scoped styles unchanged

3.8 WHEN dark mode is active THEN the system SHALL CONTINUE TO apply all existing `html.ion-palette-dark` rules already present in `dark-mode.css` without regression

3.9 WHEN dark mode is active THEN the system SHALL CONTINUE TO render `.storage-btn--active` with the green highlight (`background: #00b14f`) — the active state override SHALL take precedence over the base dark-mode storage-btn style

3.10 WHEN dark mode is active and `RecipeSuggestions` has an active tab chip THEN the system SHALL CONTINUE TO render `.tab-chip--active-all`, `.tab-chip--active-liked`, and `.tab-chip--active-made` with their respective accent colors (green, red, dark-blue) unchanged

---

## Bug Condition Pseudocode

**Fix 1 — Bug Condition**

```pascal
FUNCTION isBugCondition_Fix1(event)
  INPUT: event of type UserInteraction
  OUTPUT: boolean

  // Bug fires when user directly interacts with the checkbox element
  RETURN event.target = termsCheckbox AND event.type IN ['click', 'change']
END FUNCTION

// Property: Fix Checking
FOR ALL event WHERE isBugCondition_Fix1(event) DO
  result ← handleCheckboxInteraction'(event)
  ASSERT termsAccepted UNCHANGED
  ASSERT result = NOOP  // interaction is suppressed
END FOR

// Property: Preservation Checking
FOR ALL event WHERE NOT isBugCondition_Fix1(event) DO
  ASSERT acceptTerms'() = acceptTerms()    // I Agree still works
  ASSERT disagreeTerms'() = disagreeTerms()  // I Disagree still works
END FOR
```

**Fix 2 — Bug Condition**

```pascal
FUNCTION isBugCondition_Fix2(element, mode)
  INPUT: element of type DOMElement, mode of type ThemeMode
  OUTPUT: boolean

  // Bug fires when dark mode is active and element has a hardcoded light color
  RETURN mode = DARK
    AND element.class IN [
      'detail-container', 'detail-footer', 'green-chip', 'orange-chip',
      'step-text', 'section-label',           // RecipeDetailModal
      'sheet-ion-content', 'ingredients-card', 'storage-btn',
      'quantity-input', 'unit-select', 'date-input',  // ScanResultModal
      'analysis-results-alert',               // ScanResultModal non-product alert
      'recipe-card', 'tab-chip'               // RecipeSuggestions
    ]
    OR (element.class = 'stat-value' AND mode = DARK)  // HomePage
END FUNCTION

// Property: Fix Checking
FOR ALL element WHERE isBugCondition_Fix2(element, DARK) DO
  styles ← computedStyles'(element)
  ASSERT styles.background != '#ffffff'
  ASSERT styles.background != '#f8fafc'
  ASSERT styles.background != '#f3f4f6'
  ASSERT styles.color != '#374151'
  ASSERT styles.color != '#0f172a'
END FOR

// Property: Preservation Checking
FOR ALL element WHERE NOT isBugCondition_Fix2(element, DARK) DO
  ASSERT computedStyles'(element) = computedStyles(element)
END FOR
```
