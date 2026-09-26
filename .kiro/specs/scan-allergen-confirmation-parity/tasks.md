# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Allergen Guard Missing in ScanResultModal
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — any non-empty `matched_user_allergens` array submitted via the "Add to Pantry" button
  - Mount `ScanResultModal.vue` with `data.matched_user_allergens` set to a non-empty array (e.g. `['Peanuts']`)
  - Fill in a valid form (quantity, unit, storage location, a future expiration date)
  - Simulate a click on the "Add to Pantry" button
  - Assert that `alertController.create` was called with `header: 'Allergen Warning'` before any `POST /api/pantry_item` request is made
  - Run test on UNFIXED code — `alertController.create` is never called; the function skips straight to the expiry check and the API call proceeds immediately
  - **EXPECTED OUTCOME**: Test FAILS (confirms the bug — no allergen guard fires on unfixed code)
  - Document counterexample found: e.g. `"submitAddToPantry() with personalAllergenAlerts=['Peanuts'] calls POST /api/pantry_item without showing any alert"`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - No-Allergen Fast Path Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: on UNFIXED code, submitting with `matched_user_allergens: []` proceeds directly through the expiry check and calls `POST /api/pantry_item` — no alert shown
  - Observe: on UNFIXED code, submitting with `matched_user_allergens: []` and an expired date shows the expiry error and does NOT call `POST /api/pantry_item`
  - Write property-based test: for all submit events where `personalAllergenAlerts.value.length === 0`, the function produces exactly the same behavior as the original — no allergen dialog, same execution path through the expiry guard and API call (from Preservation Requirements in design)
  - Cover these cases:
    - Empty allergen array + valid future date → `POST /api/pantry_item` called, no `alertController.create` call
    - Empty allergen array + expired expiration date → expiry error shown, `POST /api/pantry_item` NOT called
    - Empty allergen array + expired best-before date → expiry error shown, `POST /api/pantry_item` NOT called
    - `PhotoPantryUploadModal.vue` — verify it is completely unmodified and its own allergen guard still fires independently
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.4, 3.5_

- [ ] 3. Fix allergen confirmation parity in ScanResultModal

  - [ ] 3.1 Add `alertController` to the `@ionic/vue` import and insert allergen guard in `submitAddToPantry()`
    - In `omniscan-ui/src/components/ScanResultModal.vue`, update the import line:
      - From: `import { IonModal, IonAlert, IonContent, IonIcon, IonButton, IonSpinner } from '@ionic/vue'`
      - To: `import { IonModal, IonAlert, IonContent, IonIcon, IonButton, IonSpinner, alertController } from '@ionic/vue'`
    - In `submitAddToPantry()`, immediately after `submitError.value = ''` and BEFORE `const today = new Date()`, insert:
      ```ts
      // Allergen guardrail — mirrors PhotoPantryUploadModal.vue behavior
      if (personalAllergenAlerts.value.length > 0) {
        const allergenAlert = await alertController.create({
          header: 'Allergen Warning',
          message: `This item contains allergens matching your dietary profile (${personalAllergenAlerts.value.join(', ')}). Are you sure you want to add it to your pantry?`,
          buttons: [
            { text: 'Cancel', role: 'cancel' },
            { text: 'Add Anyway', role: 'confirm' },
          ],
        })
        await allergenAlert.present()
        const { role } = await allergenAlert.onDidDismiss()
        if (role !== 'confirm') return
      }
      ```
    - Guard ordering: allergen guard runs first → if confirmed, expiry guard runs second → if passed, API call runs
    - No other files are modified (`PhotoPantryUploadModal.vue`, backend routes, and all other components are untouched)
    - _Bug_Condition: isBugCondition(submitEvent) where personalAllergenAlerts.value.length > 0_
    - _Expected_Behavior: allergenAlert presented with header "Allergen Warning" listing matched allergens; if role !== 'confirm' → return without API call; if role === 'confirm' → continue to expiry guard then API call_
    - _Preservation: when personalAllergenAlerts.value.length === 0, execution path is identical to pre-fix — no allergen dialog, same expiry guard, same API call_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.4, 3.5_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Allergen Guard Fires Before Pantry Add
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: `alertController.create` is called before any `POST /api/pantry_item` request
    - When this test passes, it confirms the allergen guard is correctly wired up
    - Also verify cancel path: mock `alertController` returning `role: 'cancel'` → assert `POST /api/pantry_item` is NOT called
    - Also verify confirm path: mock `alertController` returning `role: 'confirm'` → assert execution continues to expiry check then API call
    - Also verify multiple allergens: `matched_user_allergens: ['Milk', 'Eggs']` → assert alert message contains both names joined by `', '`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - No-Allergen Fast Path Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation property tests from step 2 against the FIXED code
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Specifically confirm: empty allergen array still bypasses the allergen dialog entirely, expiry guard still fires after allergen confirmation, `PhotoPantryUploadModal.vue` behavior is unaffected

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite for the affected component(s)
  - Confirm property 1 (bug condition exploration) passes — bug is fixed
  - Confirm property 2 (preservation) passes — no regressions introduced
  - Ensure all tests pass; ask the user if any questions arise
