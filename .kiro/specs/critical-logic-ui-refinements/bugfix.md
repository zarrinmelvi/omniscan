# Bugfix Requirements Document

## Introduction

Five critical logic and UI bugs in OmniScan (Ionic Vue frontend + Nitro backend) that together compromise allergen safety, UI accessibility, and registration flow integrity. The fixes span the recipe suggestion pipeline (`suggest.get.ts`), the dietary allergen keyword map (`dietary-map.ts`), the photo upload analysis endpoint (`analyze.post.ts`), the register page interaction model (`RegisterPage.vue`), and dark-mode visual correctness (`dark-mode.css`).

---

## Bug 1 — Strict Allergen-Free Recipe Filtering

### Bug Analysis

#### Current Behavior (Defect)

1.1 WHEN a recipe's combined ingredient text contains a direct allergen match (`directAllergenMatches.length > 0`) THEN the system includes the recipe in suggestion results with an `allergen_warnings` array instead of excluding it

1.2 WHEN a recipe's ingredient text matches a custom dietary preference rule (`preferenceWarnings.size > 0`) THEN the system includes the recipe in suggestion results with preference warning labels instead of excluding it

1.3 WHEN a user has `'eggs-free'` set as a custom preference THEN the system does not match any recipe ingredients because the `DIETARY_ALLERGEN_MAP` contains no entry for `'eggs-free'`

1.4 WHEN a user has `'milk-free'` set as a custom preference THEN the system does not match any recipe ingredients because the `DIETARY_ALLERGEN_MAP` contains no entry for `'milk-free'`

1.5 WHEN a user has any allergen-name-free preference (e.g. `'peanuts-free'`, `'wheat-free'`, `'soy-free'`, `'fish-free'`, `'shellfish-free'`, `'sesame-free'`, `'tree nuts-free'`, `'mustard-free'`) THEN the system does not evaluate the preference because those keys are absent from `DIETARY_ALLERGEN_MAP`

#### Expected Behavior (Correct)

2.1 WHEN `directAllergenMatches.length > 0` for a recipe THEN the system SHALL skip that recipe entirely and not add it to suggestion results

2.2 WHEN `preferenceWarnings.size > 0` for a recipe THEN the system SHALL skip that recipe entirely and not add it to suggestion results

2.3 WHEN a user has `'eggs-free'` as a custom preference THEN the system SHALL match recipe ingredients against the keywords `['egg', 'eggs', 'egg white', 'egg yolk', 'albumen', 'mayonnaise', 'meringue', 'ovalbumin']` and exclude matching recipes

2.4 WHEN a user has `'milk-free'` as a custom preference THEN the system SHALL match recipe ingredients against the keywords `['milk', 'cream', 'butter', 'cheese', 'lactose', 'whey', 'casein', 'ghee', 'dairy', 'yogurt', 'yoghurt']` and exclude matching recipes

2.5 WHEN a user has any of `'peanuts-free'`, `'wheat-free'`, `'soy-free'`, `'fish-free'`, `'shellfish-free'`, `'sesame-free'`, `'tree nuts-free'`, or `'mustard-free'` as custom preferences THEN the system SHALL evaluate each against its corresponding ingredient keyword list and exclude matching recipes

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a recipe contains no ingredients matching any of the user's allergens or custom dietary preferences THEN the system SHALL CONTINUE TO include the recipe in suggestion results as before

3.2 WHEN `halalPref` is true and a recipe contains non-halal keywords THEN the system SHALL CONTINUE TO exclude that recipe regardless of allergen status

3.3 WHEN a recipe has zero pantry-matched ingredients THEN the system SHALL CONTINUE TO be excluded from results

3.4 WHEN a recipe is marked as made and not all ingredients are available THEN the system SHALL CONTINUE TO be excluded from results

3.5 WHEN `DIETARY_ALLERGEN_MAP` is queried with `'dairy-free'`, `'gluten-free'`, or `'avoid msg'` THEN the system SHALL CONTINUE TO return the existing rules unchanged

---

## Bug 2 — Register Page Dark Mode Input Contrast & Border

### Bug Analysis

#### Current Behavior (Defect)

1.6 WHEN dark mode is active and the user focuses a `.custom-input` field (password or confirm password) THEN the system applies a bright `#05c450` green border from both the scoped component style and the dark-mode.css override `html.ion-palette-dark .custom-input:focus { border-color: #05c450 !important }`, which is visually distracting and contradicts the dark-mode design intent

1.7 WHEN dark mode is active and the browser applies autofill to a password or confirm-password field THEN the system renders the field with a bright yellow-green background because `color-scheme` is not set to `dark` on `.custom-input`, allowing the browser's light color-scheme autofill styling to leak through

1.8 WHEN dark mode is active and a user types text into an autofilled input THEN the typed text may render in a dark color that is illegible against the dark input background because `-webkit-text-fill-color` is not consistently enforced during autofill's color-scheme override

#### Expected Behavior (Correct)

2.6 WHEN dark mode is active and the user focuses a `.custom-input` THEN the system SHALL apply `border-color: var(--dm-border)` (not green) so only error-state inputs show a colored border

2.7 WHEN dark mode is active on any `.custom-input` THEN the system SHALL apply `color-scheme: dark` so the browser renders the autofill background in dark tones

2.8 WHEN dark mode is active and text is typed into a `.custom-input` THEN the system SHALL ensure `-webkit-text-fill-color: var(--dm-text-input)` is applied so typed text is always legible in white/light color

#### Unchanged Behavior (Regression Prevention)

3.6 WHEN light mode is active and a `.custom-input` is focused THEN the system SHALL CONTINUE TO show the green `#05c450` focus border as defined in the scoped component styles

3.7 WHEN a `.custom-input` has the `input-error` class THEN the system SHALL CONTINUE TO show the red `#ef4444` border in both light and dark mode

3.8 WHEN dark mode is active on other input types (`.date-input`, `.quantity-input`, `.sort-text-select`) THEN the system SHALL CONTINUE TO apply the existing dark-mode.css background and text-fill overrides unchanged

---

## Bug 3 — Register Flow: Remove Checkbox, Auto-open T&C on Continue

### Bug Analysis

#### Current Behavior (Defect)

1.9 WHEN the user fills out the registration form and clicks "Continue" without checking the terms checkbox THEN the system blocks registration and shows "Please accept the Terms & Conditions to continue." — requiring a manual checkbox interaction before the modal can open

1.10 WHEN the user clicks the "I Agree" button inside the Terms & Conditions modal THEN the system only sets `termsAccepted = true` and closes the modal but does NOT perform account creation — the user must have already ticked the checkbox first

1.11 WHEN the register form is displayed THEN the system shows a static inline `<div class="terms-row">` checkbox block that creates a redundant step in the UX flow since the T&C modal has its own agree/disagree buttons

#### Expected Behavior (Correct)

2.9 WHEN all form fields (name, email, password, confirm password) pass validation in `handleRegister()` THEN the system SHALL open the Terms & Conditions modal (`isTermsOpen = true`) instead of immediately attempting account registration

2.10 WHEN the user clicks "I Agree" inside the Terms & Conditions modal THEN the system SHALL perform the full account creation sequence: call `authStore.register()`, call `authStore.login()`, show success toast, advance to Step 2, and call `fetchAllergenCatalog()`

2.11 WHEN the user clicks "I Disagree" inside the Terms & Conditions modal THEN the system SHALL close the modal and return the user to the form without creating an account

2.12 WHEN the register page renders THEN the system SHALL NOT display the static `<div class="terms-row">` checkbox block

#### Unchanged Behavior (Regression Prevention)

3.9 WHEN any form field fails validation (empty, invalid email, weak password, mismatched passwords) THEN the system SHALL CONTINUE TO show the corresponding field error and block progression to the modal

3.10 WHEN registration succeeds THEN the system SHALL CONTINUE TO advance to Step 2 (dietary preferences) and call `fetchAllergenCatalog()`

3.11 WHEN registration fails with a 409 or email conflict error THEN the system SHALL CONTINUE TO show the email field error and the appropriate error message

3.12 WHEN the Terms & Conditions modal is opened via the "Continue" button path THEN the system SHALL CONTINUE TO allow the user to scroll and read the full terms text before agreeing or disagreeing

---

## Bug 4 — Upload Allergen Warning: Custom Preference Gap

### Bug Analysis

#### Current Behavior (Defect)

1.12 WHEN the photo upload analyze endpoint processes a scanned product THEN the system checks `userAllergens` (from the Allergen table) for string and semantic matches but does NOT load or evaluate the user's `custom_preferences` from `dietary_prof`

1.13 WHEN a user has `'Eggs-free'` or `'Milk-free'` as a custom dietary preference and scans a product containing eggs or milk THEN the system does not include these preference violations in `matched_user_allergens` because `analyze.post.ts` has no custom preference evaluation logic

1.14 WHEN the `DIETARY_ALLERGEN_MAP` is expanded with new entries (Fix 1) to include `'eggs-free'`, `'milk-free'`, and allergen-name-free variants THEN the upload pipeline still does not benefit from these mappings because `analyze.post.ts` never consults `DIETARY_ALLERGEN_MAP`

#### Expected Behavior (Correct)

2.13 WHEN the analyze endpoint processes a product THEN the system SHALL query the user's `dietary_prof[0].custom_preferences` in addition to their allergen list (extending the existing Prisma query to also select `dietary_prof`)

2.14 WHEN a user's custom preference matches a key in `DIETARY_ALLERGEN_MAP` and the product's combined ingredient text contains any of that rule's keywords THEN the system SHALL include that preference's label in the `matched_user_allergens` response array

2.15 WHEN custom preference warnings are computed THEN the system SHALL merge them with the existing string-match and semantic-match allergen results using the same deduplication logic, so each warning name appears at most once in `matched_user_allergens`

#### Unchanged Behavior (Regression Prevention)

3.13 WHEN a product has no ingredient text and no product name THEN the system SHALL CONTINUE TO return an empty `matched_user_allergens` array without error

3.14 WHEN a user has no `dietary_prof` record or no `custom_preferences` THEN the system SHALL CONTINUE TO function correctly, defaulting to an empty custom preferences array

3.15 WHEN string and semantic allergen matching returns results THEN the system SHALL CONTINUE TO include those results in `matched_user_allergens` regardless of whether custom preference matching also fires

3.16 WHEN `is_food_product` is false THEN the system SHALL CONTINUE TO return early without performing any allergen or preference matching

---

## Bug 5 — Dark Mode Background Leaks on Recipes Page

### Bug Analysis

#### Current Behavior (Defect)

1.15 WHEN dark mode is active and the user scrolls on the Recipes page THEN the system shows a white flash or white background in the inner scroll area because `html.ion-palette-dark .recipe-content::part(scroll)` has no explicit background override, causing the Ionic scroll shadow DOM part to use its default light background

1.16 WHEN dark mode is active on the Recipes page THEN the system renders the `.cards-list` padding area with a white or light background because no dark-mode override exists for `.cards-list`, even though the page itself has a dark background token

#### Expected Behavior (Correct)

2.16 WHEN dark mode is active and the Recipes page scroll area is rendered or scrolled THEN the system SHALL apply `background: var(--dm-bg-page)` to `html.ion-palette-dark .recipe-content::part(scroll)` so the inner shadow DOM scroll part matches the dark page background

2.17 WHEN dark mode is active and the Recipes page `.cards-list` is rendered THEN the system SHALL apply `background: var(--dm-bg-page)` so the card list container does not bleed a light background color through padding or empty areas

#### Unchanged Behavior (Regression Prevention)

3.17 WHEN light mode is active on the Recipes page THEN the system SHALL CONTINUE TO use the existing `#f9fafb` background for the recipe content area as defined in the component styles

3.18 WHEN dark mode is active and the existing `html.ion-palette-dark .recipe-content { --background: var(--dm-bg-page) }` rule is in effect THEN the system SHALL CONTINUE TO apply that rule; the new `::part(scroll)` rule supplements rather than replaces it

3.19 WHEN dark mode is active and other `::part(scroll)` overrides exist (e.g. `html.ion-palette-dark .pantry-content::part(scroll)`) THEN the system SHALL CONTINUE TO apply those rules unchanged

---

## Bug Condition Summary

```pascal
// Fix 1: Allergen / Preference Hard Exclusion
FUNCTION isBugCondition_Fix1(recipe, user)
  INPUT: recipe with raw_ingredients, user with allergens and custom_preferences
  OUTPUT: boolean
  combinedText ← recipe.ingredients joined and lowercased
  directMatches ← findMatchedUserAllergens(combinedText, user.allergens)
  prefWarnings ← evaluateCustomPreferences(combinedText, user.custom_preferences, DIETARY_ALLERGEN_MAP)
  RETURN directMatches.length > 0 OR prefWarnings.size > 0
END FUNCTION

// Property: Fix Checking
FOR ALL (recipe, user) WHERE isBugCondition_Fix1(recipe, user) DO
  result ← suggest'(user)
  ASSERT recipe NOT IN result.recipes
END FOR

// Property: Preservation Checking
FOR ALL (recipe, user) WHERE NOT isBugCondition_Fix1(recipe, user) DO
  ASSERT suggest(user).includes(recipe) = suggest'(user).includes(recipe)
END FOR
```

```pascal
// Fix 3: Registration Modal Flow
FUNCTION isBugCondition_Fix3(formState)
  INPUT: formState with all fields valid, termsAccepted = false
  OUTPUT: boolean
  RETURN formState.allFieldsValid AND NOT formState.termsAccepted
END FUNCTION

// Property: Fix Checking - Modal Opens Instead of Blocking
FOR ALL formState WHERE isBugCondition_Fix3(formState) DO
  handleRegister'(formState)
  ASSERT isTermsOpen = true AND no_registration_attempted
END FOR

// Property: Preservation Checking - Registration Happens in acceptTerms'
FOR ALL formState WHERE formState.allFieldsValid DO
  acceptTerms'()
  ASSERT registration_was_called AND login_was_called AND step = 2
END FOR
```
