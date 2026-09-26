# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Allergen Matches Not Returned by Analyze Endpoint
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the analyze endpoint discards the authenticated user and performs no allergen matching
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — mock a user with `["Milk"]` in their allergen profile and an extraction whose `ingredients_text` is `"whole milk, cream, live cultures"`. Assert `response.matched_user_allergens` includes `"Milk"`.
  - Test implementation details from Bug Condition in design:
    - Mock `requireAuth(event)` to return a user object with a known `id`
    - Mock Prisma `user.findUnique` to return allergen records for that user
    - Mock `findMatchedUserAllergens` and `matchUserAllergensSemantically` to return appropriate matches
    - Call the unfixed `analyze.post.ts` handler with a food-product payload
    - Assert `response.matched_user_allergens` is an array and contains the expected allergen name
  - Additional scoped cases to cover:
    - Semantic-only match: user has `["Soy"]`, ingredients contain `"soya lecithin"` — assert `response.matched_user_allergens` includes `"Soy"`
    - Multiple allergens: user has `["Milk", "Wheat"]`, both present in ingredients — assert both names appear
    - No overlap: user has `["Shellfish"]`, ingredients are `"oats, honey, almonds"` — assert `response.matched_user_allergens` is `[]`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — proves the bug exists; `matched_user_allergens` field will be `undefined`)
  - Document counterexamples found: `response.matched_user_allergens` is `undefined` on unfixed code because `requireAuth` return value is discarded and no Prisma query or allergen-matching functions are ever invoked
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Upload Inputs Produce Unchanged Behavior
  - **IMPORTANT**: Follow observation-first methodology — observe behavior on UNFIXED code for non-buggy inputs, then write property-based tests that assert those observed outputs
  - Observe: `POST /api/pantry_item/analyze` with `is_food_product: false` returns `{ is_food_product: false, … }` immediately; Prisma is never called
  - Observe: Upload by user with no registered allergens returns the OCR fields unchanged; no `matched_user_allergens` field present on unfixed code (fixed code adds `matched_user_allergens: []`)
  - Observe: Upload where `ingredients_text` is `""` returns OCR fields unchanged
  - Observe: Upload where user has `["Shellfish"]` but ingredients are `"oats, honey, almonds"` — neither matcher returns a hit; response has no allergen field on unfixed code
  - Observe: `handleSubmit()` in `PhotoPantryUploadModal.vue` with empty `matchedUserAllergens` calls `POST /api/pantry_item` directly, no dialog shown
  - Write property-based tests capturing these observed patterns from Preservation Requirements in design:
    - For all non-food-product responses: Prisma allergen query spy must have zero calls; response shape is `{ is_food_product: false, … }`
    - For all users with empty allergen arrays: fixed code returns `matched_user_allergens: []`; no banner rendered; no dialog on submit
    - For all ingredient texts with no allergen overlap: `mergeMatchedAllergens` returns `[]`; `matched_user_allergens: []` in response
    - For modal `handleSubmit()` with `matchedUserAllergens.value === []`: submission proceeds directly, no `alertController.create` call
  - Verify all tests PASS on UNFIXED code (confirming baseline behavior to preserve)
  - **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms baseline is captured correctly)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix: Link image upload pipeline to allergen evaluation system

  - [ ] 3.1 Implement backend fix in `analyze.post.ts`
    - Capture `requireAuth` return value: change `requireAuth(event)` to `const authUser = requireAuth(event)`
    - Add imports: `import { prisma } from '../../lib/prisma'` and `import { findMatchedUserAllergens, matchUserAllergensSemantically, mergeMatchedAllergens } from '../../lib/allergen-matching'`
    - After `if (!extraction.is_food_product) { return … }`, insert the allergen lookup block:
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
    - Change final `return extraction` to `return { ...extraction, matched_user_allergens: matchedAllergens.map((a) => a.name) }`
    - _Bug_Condition: isBugCondition(X) where X.user.allergens.length > 0 AND X.extractedIngredientsText ≠ "" AND INTERSECT(X.user.allergens, X.extractedIngredientsText) ≠ ∅_
    - _Expected_Behavior: response.matched_user_allergens IS ARRAY AND response.matched_user_allergens.length > 0 for all isBugCondition inputs_
    - _Preservation: non-food early return is unchanged; empty-allergen and no-overlap cases return matched_user_allergens: []; existing 502/400 error paths are untouched_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.5_

  - [ ] 3.2 Implement frontend fix in `PhotoPantryUploadModal.vue`
    - Add `alertController` to the `@ionic/vue` import block
    - Extend `AnalyzeResult` interface: add `matched_user_allergens: string[]`
    - Add reactive ref: `const matchedUserAllergens = ref<string[]>([])`
    - In `resetAll()`: add `matchedUserAllergens.value = []`
    - In `goToStep2()`: after `form.ingredientsText = result.ingredients_text || ''`, add `matchedUserAllergens.value = result.matched_user_allergens ?? []`
    - In `handleSubmit()`: before `isSubmitting.value = true`, insert allergen guard:
      ```ts
      if (matchedUserAllergens.value.length > 0) {
        const alert = await alertController.create({
          header: 'Allergen Warning',
          message: 'This item contains allergens matching your dietary profile. Are you sure you want to add it to your pantry?',
          buttons: [
            { text: 'Cancel', role: 'cancel' },
            { text: 'Add Anyway', role: 'confirm' },
          ],
        })
        await alert.present()
        const { role } = await alert.onDidDismiss()
        if (role === 'cancel') return
      }
      ```
    - In template Step 2: after `<div v-if="formError">` block, insert the allergen banner:
      ```html
      <div v-if="matchedUserAllergens.length > 0" class="personal-allergen-alert">
        <span class="allergen-icon">⚠️</span>
        <span>Contains your allergen(s): {{ matchedUserAllergens.join(', ') }}</span>
      </div>
      ```
    - In `<style scoped>`: add CSS for `.personal-allergen-alert` and child selectors matching the styles already in `ScanResultModal.vue`
    - _Bug_Condition: modal receives non-empty matched_user_allergens from analyze endpoint_
    - _Expected_Behavior: allergenBannerVisible in Step2UI AND confirmationDialogShown BEFORE pantryItemCreated_
    - _Preservation: matchedUserAllergens.value === [] → no banner, no dialog, direct submission_
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 3.3, 3.4_

  - [ ] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Allergen Matches Returned and Surfaced
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the fixed endpoint returns `matched_user_allergens` with the correct allergen names for all isBugCondition inputs
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Upload Inputs Produce Unchanged Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — non-food early return unchanged, empty-allergen path returns `[]`, no-overlap path returns `[]`, modal submit-without-allergens is direct)
    - Confirm all tests still pass after fix

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite covering both files changed: `analyze.post.ts` and `PhotoPantryUploadModal.vue`
  - Confirm Property 1 (Bug Condition) passes — `matched_user_allergens` is returned correctly for all isBugCondition inputs
  - Confirm Property 2 (Preservation) passes — all non-buggy paths are unaffected
  - Confirm unit tests pass: `requireAuth` capture, Prisma query shape, each matcher integration, modal ref population, reset, guard dialog, and direct-submit path
  - Ensure all tests pass; ask the user if questions arise
