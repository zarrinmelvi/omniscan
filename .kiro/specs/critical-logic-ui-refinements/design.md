# Design: Critical Logic & UI Refinements

## Overview

This document captures the bug condition analysis, expected behaviour, and preservation requirements for each of the five fixes. Each fix is described using the C(X) / P(result) / ¬C(X) methodology.

---

## Fix 1a — Recipe Suggestions: Allergen/Preference Filtering

**File:** `server/api/recipes/suggest.get.ts`

### Bug Condition

```
isBugCondition(recipe):
  combinedText = recipe.raw_ingredients.map(i => i.name).join(', ').toLowerCase()
  directAllergenMatches = findMatchedUserAllergens(combinedText, userAllergens).map(a => a.name)
  preferenceWarnings = evaluateCustomPreferences(combinedText, customPreferences)
  combinedWarnings = Array.from(new Set([...directAllergenMatches, ...preferenceWarnings]))
  return combinedWarnings.length > 0
```

The condition is true when the recipe ingredient text matches at least one user allergen or one custom-preference keyword from `DIETARY_ALLERGEN_MAP`.

**Concrete counterexample:** A user has `milk` as an allergen. A recipe has `raw_ingredients` containing `"butter"`. `findMatchedUserAllergens` returns `[{ name: 'milk', ... }]` so `combinedWarnings = ['milk']`. Currently the recipe is still pushed to `results` with `allergen_warnings: ['milk']`. Expected: the recipe is skipped entirely (no result entry).

### Expected Behavior

```
expectedBehavior(recipe):
  when isBugCondition(recipe) → recipe is NOT included in results (loop continues)
  the results array contains ONLY recipes where combinedWarnings.length === 0
  the pushed result object has NO allergen_warnings key
  the TypeScript result type has NO allergen_warnings property
```

### Expected Behavior Properties

- **P1:** For every recipe where `combinedWarnings.length > 0`, the recipe is absent from `results`.
- **P2:** For every recipe where `combinedWarnings.length === 0`, the recipe is present in `results` (subject to other existing filters: matchedCount > 0, halal check, dedup, made check).
- **P3:** No element in `results` has an `allergen_warnings` property.

### Preservation Requirements

```
¬C(recipe):
  combinedWarnings.length === 0
  (no allergen match AND no preference match)
```

Behaviour that MUST be unchanged for non-bug-condition inputs:

- Recipes with no allergen or preference match continue to be considered for inclusion.
- The halal exclusion (`if (halalPref && findNonHalalKeywords(combinedText).length > 0) continue`) is unaffected.
- Deduplication logic (`seenRecipeIds`, `seenRecipeNames`) is unaffected.
- The `matchedCount === 0` exclusion is unaffected.
- The `isMade && matchedCount < totalCount` exclusion is unaffected.
- The `RESULTS_LIMIT` cap is unaffected.
- The `interaction` (liked/made) logic is unaffected.

---

## Fix 1b — Dietary Allergen Map: Missing Entries

**File:** `server/lib/dietary-map.ts`

### Bug Condition

```
isBugCondition(pref):
  return pref.toLowerCase().trim() NOT IN keys(DIETARY_ALLERGEN_MAP)
  AND pref is one of: 'eggs-free', 'milk-free', 'peanuts-free', 'wheat-free',
      'soy-free', 'fish-free', 'shellfish-free', 'sesame-free',
      'tree nuts-free', 'mustard-free'
```

**Concrete counterexample:** User has `custom_preferences = ['Eggs-free']`. In both `suggest.get.ts` and `analyze.post.ts`, `DIETARY_ALLERGEN_MAP['eggs-free']` returns `undefined`, so the `if (rule)` guard silently skips the check. A recipe containing `"egg white"` passes through without warning.

### Expected Behavior

```
expectedBehavior(mapLookup):
  for each of the 10 new keys → DIETARY_ALLERGEN_MAP[key] returns a DietaryRule
  DietaryRule.label is the correct human-readable allergen name
  DietaryRule.keywords contains the specified keyword list
```

### Expected Behavior Properties

- **P1:** `DIETARY_ALLERGEN_MAP['eggs-free'].keywords` includes `'egg'`, `'eggs'`, `'albumen'`, `'mayonnaise'`, etc.
- **P2:** `DIETARY_ALLERGEN_MAP['milk-free'].keywords` includes `'milk'`, `'casein'`, `'ghee'`, etc.
- **P3–P10:** Analogous for peanuts-free, wheat-free, soy-free, fish-free, shellfish-free, sesame-free, tree nuts-free, mustard-free.
- **P11:** All three pre-existing keys (`dairy-free`, `gluten-free`, `avoid msg`) remain structurally identical.

### Preservation Requirements

```
¬C(pref):
  pref is one of: 'dairy-free', 'gluten-free', 'avoid msg'
```

- Pre-existing entries MUST NOT be modified (labels and keyword arrays unchanged).
- The `DietaryRule` interface MUST remain structurally the same (`{ label: string; keywords: string[] }`).
- All callers of `DIETARY_ALLERGEN_MAP` in `suggest.get.ts` and `analyze.post.ts` continue to work because they only call `DIETARY_ALLERGEN_MAP[key]` and check `if (rule)`.

---

## Fix 2 — Dark Mode: Custom Input Focus Border

**File:** `src/theme/dark-mode.css`

### Bug Condition

```
isBugCondition(element):
  html has class 'ion-palette-dark'
  AND element matches selector '.custom-input:focus'
```

**Concrete counterexample:** User activates dark mode. They click into a Name or Email input. The input border turns `#05c450` (bright green) rather than the muted dark border `var(--dm-border)` (`#334155`). Additionally, autofill popups and date pickers render with light chrome because `color-scheme` is not declared.

### Expected Behavior

```
expectedBehavior(focusedInput):
  border-color = var(--dm-border) [resolves to #334155]
  NOT border-color = #05c450

expectedBehavior(anyDarkInput):
  color-scheme = dark
```

### Expected Behavior Properties

- **P1:** In dark mode, a focused `.custom-input` has computed `border-color` equal to `var(--dm-border)`.
- **P2:** In dark mode, any `.custom-input` has `color-scheme: dark` applied.

### Preservation Requirements

```
¬C(element):
  html does NOT have class 'ion-palette-dark'
  OR element does NOT match '.custom-input:focus'
```

- Light-mode focus rule (`.custom-input:focus { border-color: #05c450; }` in scoped component CSS) is unaffected.
- The `date-input:focus` dark rule (`border-color: #22c55e !important`) is unaffected.
- All other `.custom-input` dark-mode properties (background, color, border-color at rest, autofill box-shadow) are unaffected.
- No other selectors in `dark-mode.css` are changed.

---

## Fix 3 — Registration: Modal-First Terms Flow

**File:** `src/views/RegisterPage.vue`

### Bug Condition

```
isBugCondition(registrationState):
  terms-row checkbox exists in template
  AND termsAccepted.value === false
  AND user clicks "Continue" (submits form)
  → handleRegister() returns early with termsError = true
  → user is BLOCKED from even seeing the Terms modal to read and agree
```

Additionally, `handleRegister()` itself performs the `authStore.register()` + `authStore.login()` call, coupling validation to registration in a single function that should instead delegate actual registration to `acceptTerms()`.

**Concrete counterexample:** User fills in name, email, password correctly but hasn't ticked the checkbox. They click "Continue". The form shows an error banner. The user cannot proceed without first finding the checkbox and ticking it, which creates extra UX friction. The desired behaviour is that clicking "Continue" (after form validation) directly opens the Terms modal.

### Expected Behavior

```
expectedBehavior(handleRegister):
  after all field validations pass →
    isTermsOpen.value = true
    (no register/login call here)

expectedBehavior(acceptTerms):
  async
  authStore.register(name, email, password)
  authStore.login(email, password)
  showToast('Account created successfully!', 'success')
  step.value = 2
  fetchAllergenCatalog()

expectedBehavior(disagreeTerms):
  isTermsOpen.value = false
  (nothing else)

expectedBehavior(template):
  no .terms-row div
  no termsAccepted or termsError references
```

### Expected Behavior Properties

- **P1:** `handleRegister()` opens the Terms modal (`isTermsOpen.value = true`) when all field validations pass.
- **P2:** `handleRegister()` does NOT call `authStore.register()` directly.
- **P3:** `acceptTerms()` is `async` and calls `authStore.register()`, `authStore.login()`, `showToast`, advances `step`, and calls `fetchAllergenCatalog()`.
- **P4:** `disagreeTerms()` only closes the modal.
- **P5:** The DOM contains no `.terms-row` element.
- **P6:** `termsAccepted` and `termsError` refs do not exist in the component.

### Preservation Requirements

```
¬C(registrationState):
  all existing field validations (name, email, password strength, confirm password)
  remain in handleRegister() and continue to block submission on invalid input
```

- All existing form field validations (empty-field checks, email regex, password strength, password match, name≠password) MUST remain in `handleRegister()` unchanged.
- The `isTermsOpen` ref and the Terms modal template remain in place (modal is still shown — just now triggered by form submission rather than a checkbox interaction).
- `handleBack()`, `completeSetup()`, `skipForNow()`, Step 2 logic, allergen catalog fetching — all unaffected.
- Error message (`errorMessage`) and per-field error flags (`fieldErrors`) behaviour for validation failures is unchanged.
- `isSubmitting` state remains (used during the try/catch in `acceptTerms()`).

---

## Fix 4 — Scan Analyze: Dietary Preference Warnings

**File:** `server/api/pantry_item/analyze.post.ts`

### Bug Condition

```
isBugCondition(scan):
  userWithAllergens.dietary_prof is NOT selected in the Prisma query
  AND user has non-empty custom_preferences
  AND product combinedText contains a keyword from DIETARY_ALLERGEN_MAP[preference]
  → preferenceWarnings are never computed
  → matched_user_allergens is missing preference-matched labels
```

**Concrete counterexample:** User has `custom_preferences = ['Eggs-free']`. They scan a product with `ingredients_text = "wheat flour, egg white, sugar"`. `matchedAllergens` contains only structural allergen hits. `egg white` is in `DIETARY_ALLERGEN_MAP['eggs-free'].keywords`, so `Eggs` should be in `matched_user_allergens` — but it isn't because `dietary_prof` isn't fetched.

### Expected Behavior

```
expectedBehavior(analyzeResult):
  matched_user_allergens = deduplicated union of:
    structural allergen entity names (from mergeMatchedAllergens)
    preference label hits (from DIETARY_ALLERGEN_MAP evaluation against combinedText)
```

### Expected Behavior Properties

- **P1:** When `dietary_prof` contains `['eggs-free']` and `combinedText` contains `'egg white'`, `matched_user_allergens` includes `'Eggs'`.
- **P2:** When `custom_preferences` is empty or none of the preference keywords match `combinedText`, `matched_user_allergens` equals the structural allergen names only (unchanged from current behaviour).
- **P3:** No duplicate labels appear in `matched_user_allergens` (union is deduplicated).

### Preservation Requirements

```
¬C(scan):
  user has no custom_preferences
  OR none of the custom preference keywords match combinedText
```

- The Ollama vision call, AI extraction logic, non-food product short-circuit, structural allergen matching, and all existing return fields are unaffected.
- Adding `dietary_prof` to the Prisma query uses the same `userWithAllergens` variable — no second DB call needed.
- The existing `matched_user_allergens: matchedAllergens.map(a => a.name)` is replaced by `allMatchedNames` which is a strict superset; when `preferenceWarnings` is empty the result is identical.

---

## Fix 5 — Dark Mode: Recipe Scroll Area & Card List Background

**File:** `src/theme/dark-mode.css`

### Bug Condition

```
isBugCondition(element):
  html has class 'ion-palette-dark'
  AND element matches selector '.recipe-content::part(scroll)' OR '.cards-list'
  AND no explicit background rule exists for these selectors in dark mode
  → browser fallback renders white/light background
```

**Concrete counterexample:** User is in dark mode and navigates to the Recipes page. The scroll region behind the recipe cards shows white, making text and card edges hard to read against the page background.

### Expected Behavior

```
expectedBehavior(scrollArea):
  background = var(--dm-bg-page)  [resolves to #0f172a]

expectedBehavior(cardsList):
  background = var(--dm-bg-page)
```

### Expected Behavior Properties

- **P1:** In dark mode, `.recipe-content::part(scroll)` renders with `background: var(--dm-bg-page)`.
- **P2:** In dark mode, `.cards-list` renders with `background: var(--dm-bg-page)`.

### Preservation Requirements

```
¬C(element):
  html does NOT have class 'ion-palette-dark'
```

- Light-mode appearance of `.recipe-content` and `.cards-list` is unaffected (no light-mode rules are touched).
- All other existing rules in `dark-mode.css` are unaffected — new rules are appended at the end of the file.
- The existing `html.ion-palette-dark .recipe-content { --background: var(--dm-bg-page); }` rule is unmodified.
