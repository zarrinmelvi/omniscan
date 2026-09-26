# Upload Allergen Evaluation Bugfix Design

## Overview

The photo-upload pipeline is missing allergen evaluation. When a user photographs a food label and adds it to their pantry via `POST /api/pantry_item/analyze` + `PhotoPantryUploadModal.vue`, the backend never queries the user's allergen profile, returns no `matched_user_allergens` field, and the frontend shows no warning banner or confirmation dialog before adding potentially dangerous items to the pantry.

The camera-scan flow (`POST /api/scan` + `ScanResultModal.vue`) already handles this correctly. This fix brings the upload path to full behavioral parity by:

1. Capturing `authUser` from `requireAuth(event)` in `analyze.post.ts` (currently discarded).
2. Loading the user's allergen profile and running both string-match and semantic-match passes on the extracted ingredients.
3. Returning `matched_user_allergens: string[]` alongside the existing OCR fields.
4. Displaying a `personal-allergen-alert` banner in Step 2 of `PhotoPantryUploadModal.vue`.
5. Gating `handleSubmit()` with an `alertController` confirmation when allergens are detected.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the defect — when the analyze endpoint is called by a user who has registered allergens that appear in the uploaded product's ingredients, but the system performs no matching and returns no warning data.
- **Property (P)**: The desired behavior — the fixed endpoint returns `matched_user_allergens`, and the fixed modal surfaces a banner and confirmation dialog when that array is non-empty.
- **Preservation**: The existing behavior that must remain unchanged — non-allergen upload flows, non-food-product rejections, error handling, and the scan endpoint are all unaffected by this fix.
- **`requireAuth(event)`**: Utility in `server/utils/requireAuth.ts` that validates the JWT and returns the authenticated user object. Currently called without capturing its return value in `analyze.post.ts`.
- **`findMatchedUserAllergens(text, allergens)`**: Deterministic string-match function from `server/lib/allergen-matching.ts`. Returns `MatchedAllergen[]` with `confidence: 1`.
- **`matchUserAllergensSemantically(text, allergens)`**: AI-backed semantic match from `server/lib/allergen-matching.ts`. Returns `SemanticAllergenMatch[]` with fractional confidence. Returns `[]` on error (fail-safe).
- **`mergeMatchedAllergens(stringMatches, semanticMatches)`**: Deduplicates by allergen `id`, string matches take precedence.
- **`alertController`**: Ionic Vue utility for presenting native-style alert dialogs.
- **`personal-allergen-alert`**: Shared CSS class used by `ScanResultModal.vue` and `PantryItemDetail.vue` for the allergen warning banner.

---

## Bug Details

### Bug Condition

The bug manifests whenever a logged-in user with at least one registered allergen uploads an image whose extracted `ingredients_text` contains one or more of those allergens. The `analyze.post.ts` handler discards the return value of `requireAuth(event)`, so `authUser` is never available, making it impossible to load the user's allergen profile. Consequently the endpoint returns no allergen data, the modal has no `matchedUserAllergens` state to populate, and the submission guard is never triggered.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type UploadRequest
  OUTPUT: boolean

  RETURN X.is_food_product = true
     AND X.extractedIngredientsText ≠ ""
     AND X.user.allergens.length > 0
     AND INTERSECT(X.user.allergens, X.extractedIngredientsText) ≠ ∅
END FUNCTION
```

### Examples

- **Milk allergen / dairy product**: User has "Milk" in their allergen profile. They upload a photo of a yoghurt label. `ingredients_text` contains "whole milk, cream, live cultures". Expected: response includes `matched_user_allergens: ["Milk"]`, banner shown in Step 2, confirmation dialog before adding. Actual (unfixed): response has no `matched_user_allergens` field, no banner, no dialog — item is added silently.

- **Peanut allergen / snack bar**: User has "Peanut" registered. They upload a photo of a cereal bar whose label reads "…peanuts, oats, honey…". Expected: response includes `matched_user_allergens: ["Peanut"]`, allergen alert visible in Step 2. Actual (unfixed): no allergen data, no warning.

- **Semantic-only match (soy / lecithin)**: User has "Soy" registered; `ingredients_text` includes "soya lecithin" (not the exact string "soy"). String match misses it, semantic match catches it with high confidence. Expected: `matched_user_allergens: ["Soy"]` via semantic path. Actual (unfixed): no matching occurs at all.

- **Edge case — no allergens registered**: User has no allergens. Any upload. Expected: `matched_user_allergens: []`, no banner, no dialog — unchanged behavior. This is NOT a bug condition.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `POST /api/pantry_item/analyze` continues to return exactly the same response shape for non-food images (`{ is_food_product: false, … }`) — the allergen lookup is skipped entirely for that path.
- When a user has no registered allergens, or `ingredients_text` is empty, the response returns `matched_user_allergens: []` and the modal behaves identically to today (no banner, no dialog).
- All existing error handling (502 on AI service failure, 400 on missing form data) is preserved with no changes.
- The submission flow for items with no allergen matches proceeds directly to `POST /api/pantry_item` without any additional confirmation step.
- `POST /api/scan` and `ScanResultModal.vue` are not touched by this fix.

**Scope:**
All inputs that do NOT satisfy `isBugCondition` must be completely unaffected. This includes:
- Uploads of non-food items.
- Uploads by users with empty allergen profiles.
- Uploads whose extracted ingredients contain none of the user's allergens.
- Mouse interactions, form field edits, and all other UI events in `PhotoPantryUploadModal.vue`.

---

## Hypothesized Root Cause

Based on code inspection of `analyze.post.ts`:

1. **Discarded `requireAuth` return value**: `requireAuth(event)` is called but its return value (the authenticated user object) is never bound to a variable. Without `authUser`, the endpoint cannot pass `authUser.id` to Prisma to fetch allergen records. This is the primary root cause — everything else flows from this single missing assignment.

2. **No Prisma allergen query**: Even if `authUser` were available, the handler contains no `prisma.user.findUnique(…)` call to load allergen records. The scan endpoint (`index.post.ts`) performs this query with a well-defined `select` shape; the analyze endpoint simply never does.

3. **No allergen-matching invocations**: `findMatchedUserAllergens`, `matchUserAllergensSemantically`, and `mergeMatchedAllergens` are never imported or called in `analyze.post.ts`.

4. **Response excludes `matched_user_allergens`**: The final `return extraction` (and the early `return { is_food_product: false, … }`) never includes a `matched_user_allergens` field, so the frontend has no data to work with even if the matching were added.

5. **Frontend has no corresponding state or UI**: `PhotoPantryUploadModal.vue` defines no `matchedUserAllergens` ref, the `AnalyzeResult` interface lacks the field, `resetAll()` doesn't clear it, `goToStep2()` doesn't populate it, the Step 2 template has no banner slot, and `handleSubmit()` has no allergen guard.

---

## Correctness Properties

Property 1: Bug Condition — Allergen Matches Returned and Surfaced

_For any_ upload request where `isBugCondition` holds (authenticated user, food product detected, non-empty ingredients, at least one allergen match), the fixed `analyze.post.ts` handler SHALL return a `matched_user_allergens` array containing the names of all matched allergens, the fixed `PhotoPantryUploadModal.vue` SHALL display the `personal-allergen-alert` banner in Step 2, and SHALL present an `alertController` confirmation dialog before any pantry item is created.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation — Non-Buggy Inputs Unchanged

_For any_ upload request where `isBugCondition` does NOT hold (non-food product, empty ingredients, or no allergen overlap), the fixed endpoint SHALL produce a response identical in shape and content to the original endpoint, and the fixed modal SHALL behave identically to the original modal — no banner, no dialog, direct submission.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

---

## Fix Implementation

### Changes Required

**File 1**: `nitro-app/server/api/pantry_item/analyze.post.ts`

**Changes:**

1. **Capture `authUser`**: Change `requireAuth(event)` to `const authUser = requireAuth(event)` so the authenticated user is available throughout the handler.

2. **Add imports**: Add `prisma` from `'../../lib/prisma'` and the three allergen-matching functions from `'../../lib/allergen-matching'`.

3. **Add allergen lookup after the non-food early return**: After the `if (!extraction.is_food_product) { return … }` block, insert:
   ```ts
   const userWithAllergens = await prisma.user.findUnique({
     where: { id: authUser.id },
     select: {
       allergens: {
         select: {
           id: true,
           name: true,
           scientific_name: true,
           ingredient_mapping: { select: { scientific_term: true, simplified_term: true } },
         },
       },
     },
   })

   const userAllergens = userWithAllergens?.allergens ?? []
   const stringMatches = findMatchedUserAllergens(extraction.ingredients_text, userAllergens)
   const semanticMatches = await matchUserAllergensSemantically(extraction.ingredients_text, userAllergens)
   const matchedAllergens = mergeMatchedAllergens(stringMatches, semanticMatches)
   ```

4. **Extend the return value**: Change the final `return extraction` to:
   ```ts
   return {
     ...extraction,
     matched_user_allergens: matchedAllergens.map((a) => a.name),
   }
   ```
   The non-food early return already returns a fixed shape and does not need `matched_user_allergens` (the modal never reaches Step 2 for non-food results).

---

**File 2**: `omniscan-ui/src/components/PhotoPantryUploadModal.vue`

**Changes:**

1. **Add `alertController` to Ionic imports** in the `@ionic/vue` import block.

2. **Extend `AnalyzeResult` interface** to include `matched_user_allergens: string[]`.

3. **Add reactive ref**: `const matchedUserAllergens = ref<string[]>([])`

4. **Reset in `resetAll()`**: Add `matchedUserAllergens.value = []`.

5. **Populate in `goToStep2()`**: After `form.ingredientsText = result.ingredients_text || ''`, add:
   ```ts
   matchedUserAllergens.value = result.matched_user_allergens ?? []
   ```

6. **Allergen guard in `handleSubmit()`**: Before `isSubmitting.value = true`, insert the `alertController` confirmation block that presents the warning dialog and returns early if the user cancels.

7. **Allergen banner in template Step 2**: Insert the `personal-allergen-alert` `<div>` block after the `<div v-if="formError">` block.

8. **Add scoped CSS**: Add the `personal-allergen-alert` block and its child selectors to the `<style scoped>` section, matching the styles already used in `ScanResultModal.vue`.

---

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach: first run exploratory tests on the unfixed code to confirm the bug and root cause, then verify the fix against both the bug condition (fix checking) and all other inputs (preservation checking).

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples on UNFIXED code to confirm the root cause before implementing the fix.

**Test Plan**: Write unit tests that mock the Prisma user query and allergen-matching functions, then call the unfixed `analyze.post.ts` handler with a food-product image response that yields non-empty `ingredients_text`. Assert that `matched_user_allergens` is present and non-empty in the response. These assertions will fail on unfixed code.

**Test Cases:**

1. **String-match allergen present**: User has `["Milk"]` in their allergen profile; extracted `ingredients_text` is `"whole milk, cream, live cultures"`. Assert `response.matched_user_allergens` includes `"Milk"`. → **Will fail on unfixed code** (field absent).

2. **Semantic-only allergen match**: User has `["Soy"]`; `ingredients_text` is `"soya lecithin, sugar, palm oil"`. String match misses it; semantic mock returns a match. Assert `response.matched_user_allergens` includes `"Soy"`. → **Will fail on unfixed code**.

3. **Multiple allergens**: User has `["Milk", "Wheat"]`; `ingredients_text` contains both. Assert response contains both names. → **Will fail on unfixed code**.

4. **Edge case — out-of-range / no match**: User has `["Shellfish"]`; `ingredients_text` is `"oats, honey, almonds"`. Assert `response.matched_user_allergens` is `[]`. → **Will fail on unfixed code** (field absent entirely).

**Expected Counterexamples:**
- `response.matched_user_allergens` is `undefined` on unfixed code (field not returned).
- Root cause confirmed: `requireAuth` return value is discarded; no Prisma query is executed; no allergen-matching functions are invoked.

---

### Fix Checking

**Goal**: Verify that for all inputs where `isBugCondition` holds, the fixed endpoint and modal produce the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  response := analyzeEndpoint_fixed(X)
  ASSERT response.matched_user_allergens IS ARRAY
  ASSERT response.matched_user_allergens.length > 0
  ASSERT allergenBannerVisible IN Step2UI(response)
  ASSERT confirmationDialogShown BEFORE pantryItemCreated(response)
END FOR
```

---

### Preservation Checking

**Goal**: Verify that for all inputs where `isBugCondition` does NOT hold, the fixed endpoint produces the same response as the original, and the modal behaves identically.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT analyzeEndpoint_original(X).ocr_fields = analyzeEndpoint_fixed(X).ocr_fields
  ASSERT analyzeEndpoint_fixed(X).matched_user_allergens = []
  ASSERT allergenBannerNotVisible IN Step2UI
  ASSERT confirmationDialogNotShown BEFORE pantryItemCreated
END FOR
```

**Testing Approach**: Property-based testing is well-suited here because it generates many ingredient text / allergen profile combinations automatically, providing strong guarantees that only genuinely matching inputs trigger the allergen path.

**Test Cases:**

1. **No-allergen user preservation**: User has `[]` allergens. Upload any food product. Observe on unfixed code that the response shape is the same (minus the missing field); verify on fixed code that `matched_user_allergens: []` is returned, no banner, no dialog.

2. **Non-food product preservation**: Image is classified as non-food. Fixed code must still return `{ is_food_product: false, … }` immediately — Prisma query must NOT run, as it would be a wasted round-trip.

3. **Empty ingredients preservation**: `ingredients_text` is `""`. Fixed code returns `matched_user_allergens: []`.

4. **No overlap preservation**: User has `["Shellfish"]`; `ingredients_text` contains only `"oats, honey, almonds"`. Both string and semantic matchers return `[]`. Response has `matched_user_allergens: []`.

5. **Submit without allergens**: With `matchedUserAllergens.value === []`, `handleSubmit()` must proceed directly to `POST /api/pantry_item` with no dialog — existing behavior preserved.

---

### Unit Tests

- Test `requireAuth` return value is captured and `authUser.id` is passed to Prisma.
- Test that Prisma query uses the correct `select` shape (matching the scan endpoint pattern).
- Test each allergen-matching function integration: string match, semantic match, and merge.
- Test that `matched_user_allergens` in the response contains only allergen name strings.
- Test `resetAll()` clears `matchedUserAllergens`.
- Test `goToStep2()` populates `matchedUserAllergens` from the response.
- Test `handleSubmit()` presents the confirmation dialog when `matchedUserAllergens` is non-empty.
- Test `handleSubmit()` proceeds when the user confirms, and aborts when the user cancels.

### Property-Based Tests

- Generate random allergen profiles and ingredient texts; verify that `matched_user_allergens` is non-empty if and only if at least one allergen term appears in the ingredients.
- Generate random ingredient texts with no allergen overlap; verify `matched_user_allergens` is always `[]` and the modal never shows a banner or dialog.
- Generate random non-food product responses; verify the allergen lookup is never triggered (Prisma spy called zero times).

### Integration Tests

- Full upload flow with allergen match: upload food image → Step 2 shows banner → tap "Add to Pantry" → confirmation dialog appears → tap "Add Anyway" → item created successfully.
- Full upload flow with allergen match, user cancels: same as above but tap "Cancel" → modal stays on Step 2 → no pantry item created.
- Full upload flow with no allergen match: upload food image → Step 2 shows no banner → tap "Add to Pantry" → no dialog → item created directly.
- Full upload flow for non-food image: response is `{ is_food_product: false }` → `nonFoodDetected` alert shown on Step 1 → no progression to Step 2, no allergen check.
