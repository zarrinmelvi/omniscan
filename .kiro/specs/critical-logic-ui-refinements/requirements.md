# Requirements: Critical Logic & UI Refinements

## Overview

Five targeted bugfixes across the OmniScan backend and frontend addressing allergen/preference filtering correctness, dietary keyword coverage, dark-mode styling consistency, the registration terms-and-conditions flow, and scan-result allergen enrichment.

---

## Fix 1a — Recipe Suggestions: Allergen/Preference Filtering (`suggest.get.ts`)

### 1.1 Bug Condition
**What happens:** Recipes containing user allergens or dietary-preference violations are included in suggestions. The `combinedWarnings` array is computed but never used to gate the suggestion loop, and the warnings are exposed on the result object.

**When it happens:** Whenever `combinedWarnings.length > 0` for a candidate recipe — i.e., any recipe whose ingredient text matches a user allergen or a dietary-preference keyword.

**Expected behaviour:** A recipe that triggers at least one allergen or custom-preference warning MUST be skipped (excluded from results). The `allergen_warnings` field MUST be removed from the result type and the pushed result object because the field becomes meaningless once filtering is strict.

### Acceptance Criteria

- **1.1** After `combinedWarnings` is computed, if `combinedWarnings.length > 0` the loop MUST `continue` to the next recipe (skip it entirely).
- **1.2** The TypeScript result type annotation MUST NOT include an `allergen_warnings: string[]` property.
- **1.3** The `results.push(...)` call MUST NOT include an `allergen_warnings` key.

---

## Fix 1b — Dietary Allergen Map: Missing Common Allergen Entries (`dietary-map.ts`)

### 1.2 Bug Condition
**What happens:** The `DIETARY_ALLERGEN_MAP` only covers three preferences (`dairy-free`, `gluten-free`, `avoid msg`). Users who select standard allergen preferences (eggs, milk, peanuts, wheat, soy, fish, shellfish, sesame, tree nuts, mustard) get no preference-based keyword matching — their dietary-preference flags silently have no effect in both `suggest.get.ts` and `analyze.post.ts`.

**When it happens:** Any time a user's `custom_preferences` array contains one of the ten missing allergen preference keys and a product/recipe contains a matching ingredient keyword.

**Expected behaviour:** All ten standard allergen preference keys MUST have entries in `DIETARY_ALLERGEN_MAP` so keyword matching fires correctly.

### Acceptance Criteria

- **1.4** `DIETARY_ALLERGEN_MAP` MUST contain an entry for `'eggs-free'` with label `'Eggs'` and the specified keywords.
- **1.5** `DIETARY_ALLERGEN_MAP` MUST contain an entry for `'milk-free'` with label `'Milk'` and the specified keywords.
- **1.6** `DIETARY_ALLERGEN_MAP` MUST contain an entry for `'peanuts-free'` with label `'Peanuts'` and the specified keywords.
- **1.7** `DIETARY_ALLERGEN_MAP` MUST contain an entry for `'wheat-free'` with label `'Wheat'` and the specified keywords.
- **1.8** `DIETARY_ALLERGEN_MAP` MUST contain an entry for `'soy-free'` with label `'Soy'` and the specified keywords.
- **1.9** `DIETARY_ALLERGEN_MAP` MUST contain an entry for `'fish-free'` with label `'Fish'` and the specified keywords.
- **1.10** `DIETARY_ALLERGEN_MAP` MUST contain an entry for `'shellfish-free'` with label `'Shellfish'` and the specified keywords.
- **1.11** `DIETARY_ALLERGEN_MAP` MUST contain an entry for `'sesame-free'` with label `'Sesame'` and the specified keywords.
- **1.12** `DIETARY_ALLERGEN_MAP` MUST contain an entry for `'tree nuts-free'` with label `'Tree Nuts'` and the specified keywords.
- **1.13** `DIETARY_ALLERGEN_MAP` MUST contain an entry for `'mustard-free'` with label `'Mustard'` and the specified keywords.
- **1.14** All existing entries (`dairy-free`, `gluten-free`, `avoid msg`) MUST be preserved unchanged.

---

## Fix 2 — Dark Mode: Custom Input Focus Border & Color Scheme (`dark-mode.css`)

### 2.1 Bug Condition
**What happens:** In dark mode, focused `custom-input` fields show a hardcoded bright green border (`#05c450`) instead of the design-system dark border token. Additionally, the input's native browser color scheme is not set to `dark`, which can cause autofill and date-picker UI chrome to render in light mode even when the app is in dark mode.

**When it happens:** Any time a user focuses a `custom-input` element while the `ion-palette-dark` class is active on `<html>`.

**Expected behaviour:** Focused inputs in dark mode MUST use `var(--dm-border)` for their border colour. All `custom-input` elements in dark mode MUST declare `color-scheme: dark` so browser-native UI chrome respects the dark theme.

### Acceptance Criteria

- **2.1** The rule `html.ion-palette-dark .custom-input:focus` MUST set `border-color: var(--dm-border) !important` (not a hardcoded hex value).
- **2.2** A new rule `html.ion-palette-dark .custom-input` MUST set `color-scheme: dark`.
- **2.3** The old `border-color: #05c450 !important` focus rule MUST be removed.

---

## Fix 3 — Registration Flow: Terms Checkbox Removed, Modal-First Flow (`RegisterPage.vue`)

### 3.1 Bug Condition
**What happens:** The registration form shows a checkbox that the user must tick before submitting. If they haven't ticked it, the form blocks submission with an error. This creates friction: the user cannot proceed to read the terms unless they first find and tick the checkbox before clicking "Continue". The desired flow is modal-first — clicking "Continue" opens the Terms modal; acceptance of the modal triggers the actual registration call.

**When it happens:** On every registration attempt where the terms checkbox is present and the user clicks "Continue" without first ticking the checkbox.

**Expected behaviour:** Remove the checkbox entirely. Clicking "Continue" on the form (after passing validation) opens the Terms & Conditions modal. Clicking "I Agree" inside the modal performs the registration + login sequence and advances to Step 2. Clicking "I Disagree" simply closes the modal.

### Acceptance Criteria

- **3.1** The `<div class="terms-row">...</div>` block MUST be removed from the template.
- **3.2** The `termsAccepted` ref MUST be removed from the script.
- **3.3** The `termsError` ref MUST be removed from the script.
- **3.4** The `if (!termsAccepted.value)` guard block inside `handleRegister()` MUST be removed.
- **3.5** After all validations pass in `handleRegister()`, the function MUST set `isTermsOpen.value = true` and return — it MUST NOT perform the `authStore.register()` / `authStore.login()` call itself.
- **3.6** `acceptTerms()` MUST become `async` and MUST perform: `authStore.register()` + `authStore.login()` + `showToast(...)` + `step.value = 2` + `fetchAllergenCatalog()`.
- **3.7** `disagreeTerms()` MUST only set `isTermsOpen.value = false` (no other side-effects).

---

## Fix 4 — Scan Analyze: Dietary Preference Warnings Included in Results (`analyze.post.ts`)

### 4.1 Bug Condition
**What happens:** The `/api/pantry_item/analyze` endpoint returns `matched_user_allergens` sourced only from structural allergen entity matching. Users' custom dietary preferences (e.g. `dairy-free`, `eggs-free`) are completely ignored — even if the scanned product contains a matching ingredient keyword, the preference warning is never surfaced.

**When it happens:** Whenever a user with non-empty `custom_preferences` scans a product whose `combinedText` contains a keyword matched by any preference rule in `DIETARY_ALLERGEN_MAP`.

**Expected behaviour:** The endpoint MUST fetch the user's `dietary_prof`, evaluate `custom_preferences` against `DIETARY_ALLERGEN_MAP`, and merge any preference label hits into the returned `matched_user_allergens` array.

### Acceptance Criteria

- **4.1** `analyze.post.ts` MUST import `DIETARY_ALLERGEN_MAP` from `'../../lib/dietary-map'`.
- **4.2** The Prisma `user.findUnique` query MUST also select `dietary_prof: { select: { custom_preferences: true }, orderBy: { updated_at: 'desc' }, take: 1 }`.
- **4.3** After `mergeMatchedAllergens`, the handler MUST read `customPreferences` from `userWithAllergens?.dietary_prof?.[0]?.custom_preferences ?? []`.
- **4.4** For each preference in `customPreferences`, if a matching rule exists in `DIETARY_ALLERGEN_MAP` and any of its keywords appear in `combinedText`, the rule's `label` MUST be added to a `preferenceWarnings` set.
- **4.5** The final returned `matched_user_allergens` MUST be the deduplicated union of structural allergen names and preference warning labels (`allMatchedNames`).

---

## Fix 5 — Dark Mode: Recipe Scroll Area & Card List Background (`dark-mode.css`)

### 5.1 Bug Condition
**What happens:** The recipe page's scroll area (`.recipe-content::part(scroll)`) and the card list container (`.cards-list`) do not have explicit dark-mode background rules. They inherit or fall back to a light background, causing a visual flash or white bleed behind the recipe cards in dark mode.

**When it happens:** Whenever the recipes page or card list is rendered with `ion-palette-dark` active.

**Expected behaviour:** Both `.recipe-content::part(scroll)` and `.cards-list` MUST use `var(--dm-bg-page)` as their background in dark mode.

### Acceptance Criteria

- **5.1** `html.ion-palette-dark .recipe-content::part(scroll)` MUST set `background: var(--dm-bg-page)`.
- **5.2** `html.ion-palette-dark .cards-list` MUST set `background: var(--dm-bg-page)`.
- **5.3** The new rules MUST be appended at the end of `dark-mode.css` without modifying any existing rules.
