# Implementation Plan

---

## Feature 1 — Real Food / Anti-Cartoon Validation (scan + upload)

- [ ] 1. Write bug condition exploration test (Feature 1)
  - **Property 1: Bug Condition** — Non-Photographic Image Accepted
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples showing cartoons/drawings are not rejected
  - **Scoped PBT Approach**: Scope to concrete failing case — mock AI response with `{ is_food_product: true, is_real_photo: false }`
  - In `scan/index.post.ts` unit test: call the handler with a mocked extraction where `is_real_photo` is absent/false; assert the handler does NOT throw 422 with the cartoon message (it will pass through — that is the bug)
  - In `analyze.post.ts` unit test: call `coerceUploadExtraction({ is_food_product: true })` (no `is_real_photo`); assert returned object has no `is_real_photo` field
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL — cartoons are accepted without any 422 rejection (confirms bug exists)
  - Document counterexample: "cartoon image with `is_food_product: true` proceeds to full scan result"
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.7_

- [ ] 2. Write preservation property tests — Feature 1 (BEFORE implementing fix)
  - **Property 2: Preservation** — Real Photos and Non-Food Rejection Are Unaffected
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on unfixed code: `coerceAiExtraction({ is_food_product: false, ... })` → handler throws 422 with non-food message
  - Observe on unfixed code: `coerceAiExtraction({ is_food_product: true, ... })` with a full real-photo mock → scan completes and returns `{ success: true, scan: { ... } }`
  - Write property-based test: for all mock extractions where `is_food_product: true` (and no `is_real_photo` field yet), the response shape includes `success`, `scan.product`, `scan.safety_verdict`, `scan.alternatives`, `scan.alternatives_message`
  - Write property-based test: for all mock extractions where `is_food_product: false`, handler throws 422 with existing non-food message
  - Verify both tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2_

- [ ] 3. Fix Feature 1 — `server/api/scan/index.post.ts`

  - [ ] 3.1 Add `is_real_photo: boolean` to `ScanAiExtraction` interface
    - Open `nitro-app/server/api/scan/index.post.ts`
    - In the `ScanAiExtraction` interface, add `is_real_photo: boolean` on the line after `is_food_product: boolean`
    - _Bug_Condition: isBugCondition(input) where extraction.is_real_photo field does not exist in the interface_
    - _Requirements: 2.1_

  - [ ] 3.2 Update `buildPrompt()` with `is_real_photo` JSON field and instruction
    - In `buildPrompt()`, add `"is_real_photo": boolean` to the JSON shape string after `"net_unit": string | null`
    - Append the instruction: `'"is_real_photo" must be true ONLY when the image is a genuine real-world photograph of a physical food product. Set is_real_photo to false for cartoons, drawings, illustrations, anime, digital art, paintings, sketches, screenshots of apps, or any non-photographic depiction — even if it shows food.'`
    - _Requirements: 2.1_

  - [ ] 3.3 Update `coerceAiExtraction()` to map `is_real_photo`
    - In `coerceAiExtraction()`, add `is_real_photo: normalizeToBoolean(candidate.is_real_photo)` to the returned object
    - Place it after the `is_food_product` line, using the existing `normalizeToBoolean` helper (strict: absent/non-boolean → false)
    - _Requirements: 2.1_

  - [ ] 3.4 Add `is_real_photo` rejection guard after the `is_food_product` check
    - In the `defineEventHandler`, immediately after the `if (!extraction.is_food_product)` block, add:
      ```ts
      if (!extraction.is_real_photo) {
        throw createError({
          statusCode: 422,
          statusMessage: 'Please scan a real photo of a food product — cartoons, drawings, and illustrations are not supported.',
        })
      }
      ```
    - The `is_food_product` check must remain first; `is_real_photo` check comes second
    - _Bug_Condition: isBugCondition(input) where is_real_photo is false_
    - _Expected_Behavior: 422 with cartoon rejection message_
    - _Requirements: 2.1_

  - [ ] 3.5 Verify bug condition exploration test now passes (scan endpoint)
    - **Property 1: Expected Behavior** — Non-Photographic Image Rejection
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run the scan endpoint exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES — handler now throws 422 with cartoon rejection message
    - _Requirements: 2.1_

  - [ ] 3.6 Verify preservation tests still pass (scan endpoint)
    - **Property 2: Preservation** — Real Photos and Non-Food Rejection Are Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2
    - Run both preservation tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS — real-photo scans still complete; non-food 422 still fires before `is_real_photo` check
    - _Requirements: 3.1, 3.2_

- [ ] 4. Fix Feature 1 — `server/api/pantry_item/analyze.post.ts`

  - [ ] 4.1 Add `is_real_photo: boolean` to `UploadAiExtraction` interface
    - In `analyze.post.ts`, add `is_real_photo: boolean` to `UploadAiExtraction` after `is_food_product: boolean`
    - _Requirements: 2.2_

  - [ ] 4.2 Update `buildAnalyzePrompt()` with `is_real_photo` JSON field and instruction
    - In `buildAnalyzePrompt()`, add `"is_real_photo": boolean` to the JSON shape string
    - Append the instruction: `'"is_real_photo" must be true only for genuine real-world photographs. Set to false for cartoons, drawings, illustrations, digital art, or any non-photographic image.'`
    - _Requirements: 2.2_

  - [ ] 4.3 Update `coerceUploadExtraction()` to map `is_real_photo` with safe default
    - In `coerceUploadExtraction()`, add `is_real_photo: typeof c.is_real_photo === 'boolean' ? c.is_real_photo : true` to the returned object
    - Safe default is `true` (absent field means "treat as real photo") to avoid false rejections in the upload flow
    - _Requirements: 2.2, 3.1_

  - [ ] 4.4 Widen the non-food early-return condition to include `is_real_photo`
    - Change `if (!extraction.is_food_product)` to `if (!extraction.is_food_product || !extraction.is_real_photo)`
    - Include `is_real_photo: extraction.is_real_photo` in the returned early-exit object so the Vue component can distinguish the two cases
    - Returned shape: `{ is_food_product: false, is_real_photo: extraction.is_real_photo, product_name: '', expiration_date: null, ingredients_text: '', net_quantity: null, net_unit: null }`
    - _Bug_Condition: isBugCondition(input) where is_real_photo is false_
    - _Expected_Behavior: early return with is_real_photo: false so Vue component can set nonFoodMessage_
    - _Preservation: is_food_product: false path still fires first_
    - _Requirements: 2.2, 3.2_

- [ ] 5. Fix Feature 1 — `omniscan-ui/src/components/PhotoPantryUploadModal.vue`

  - [ ] 5.1 Add `nonFoodMessage` ref and `is_real_photo` to `AnalyzeResult` interface
    - In `<script setup>`, add `const nonFoodMessage = ref('')` after the existing `nonFoodDetected` ref
    - In the `AnalyzeResult` interface, add `is_real_photo?: boolean`
    - _Requirements: 2.2_

  - [ ] 5.2 Update `goToStep2()` to set `nonFoodMessage` based on `is_real_photo`
    - Replace the `if (!result.is_food_product)` block with:
      ```ts
      if (!result.is_food_product || result.is_real_photo === false) {
        nonFoodDetected.value = true
        nonFoodMessage.value = result.is_real_photo === false
          ? 'Cartoons and drawings are not supported. Please upload a real photo of a food item.'
          : 'Non-food product detected. Only edible food items can be added to your pantry.'
        return
      }
      ```
    - _Requirements: 2.2_

  - [ ] 5.3 Reset `nonFoodMessage` in `resetAll()`
    - In `resetAll()`, add `nonFoodMessage.value = ''` alongside `nonFoodDetected.value = false`
    - _Requirements: 2.2_

  - [ ] 5.4 Replace hardcoded `.nonfood-alert` text with `nonFoodMessage`
    - In the template, replace the hardcoded text inside `<div v-if="nonFoodDetected" class="nonfood-alert">` with `{{ nonFoodMessage || 'Non-food product detected. Only edible food items can be added to your pantry.' }}`
    - _Requirements: 2.2_

---

## Feature 2 — AI Alternatives Endpoint + Show Alternatives Button

- [ ] 6. Write bug condition exploration test (Feature 2)
  - **Property 3: Bug Condition** — No "Show Alternatives" Button When Allergen Alert Is Present
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Confirm there is no "Show Alternatives" button in the current DOM
  - **Scoped PBT Approach**: Mount `ScanResultModal.vue` in a test with `data.matched_user_allergens: ['Milk']` and `data.alternatives: []`; query the DOM for a "Show Alternatives" button; assert it does NOT exist (it will not be found — that is the bug)
  - Also confirm `GET /api/alternatives/ai-suggest` does not exist yet (can be a simple 404 fetch test against the Nitro dev server, or assert the file is absent)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL — no button is rendered; endpoint returns 404
  - Document counterexample: "allergen alert present but no way to discover alternatives"
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.2, 1.3_

- [ ] 7. Write preservation property tests — Feature 2 (BEFORE implementing fix)
  - **Property 4: Preservation** — No Alternatives Button Without Allergen Alert; Catalog Alternatives Unaffected
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on unfixed code: mount `ScanResultModal` with `matched_user_allergens: []` and `alternatives: [{ id: 1, brand_name: 'X', product_name: 'Y' }]`; confirm the catalog alternatives section renders
  - Observe on unfixed code: mount with `matched_user_allergens: []` and `alternatives: []` with `alternatives_message: 'No known alternatives for this product yet.'`; confirm the alternatives section renders with that message
  - Write property-based test: for all `data` objects where `matched_user_allergens` is empty, no element with text "Show Alternatives" is rendered in `ScanResultModal`
  - Write property-based test: for all `data` objects where `alternatives` is non-empty, each alt's `brand_name` and `product_name` appear in the rendered DOM
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline to preserve)
  - _Requirements: 3.3, 3.4_

- [ ] 8. Fix Feature 2 — Create `server/api/alternatives/ai-suggest.get.ts`
  - Create the new file `nitro-app/server/api/alternatives/ai-suggest.get.ts`
  - Call `requireAuth(event)` — endpoint requires authentication
  - Read `product_name`, `brand_name`, `user_allergens` from `getQuery(event)`
  - Return HTTP 400 if `product_name` is absent or empty
  - Build a structured prompt targeting Indian and Southeast Asian markets; instruct the model to return a JSON array of `{ product_name: string, brand_name: string, reason: string }` objects (3–5 items) that avoid the stated allergens, or `[]` if none exist
  - Call `GENERATION_MODEL` via `OLLAMA_ENDPOINT` with `format: 'json'` (same pattern as other endpoints — import from `../../lib/ollama-models`)
  - Parse response with `stripCodeFences` (import from `../../lib/ai-json`), filter to objects that have non-empty `product_name` and `brand_name`
  - Return `{ suggestions: Array<{ product_name: string, brand_name: string, reason: string }> }`
  - Throw HTTP 502 on upstream fetch failure
  - _Bug_Condition: isBugCondition(input) where /api/alternatives/ai-suggest endpoint does not exist_
  - _Expected_Behavior: endpoint returns { suggestions: [...] } for valid product_name_
  - _Requirements: 2.9_

- [ ] 9. Fix Feature 2 — `omniscan-ui/src/components/ScanResultModal.vue`

  - [ ] 9.1 Add new refs and imports for AI alternatives
    - In `<script setup>`, add the following refs:
      ```ts
      const showAlternativesSection = ref(false)
      const aiSuggestions = ref<{ product_name: string; brand_name: string; reason: string }[]>([])
      const aiLoading = ref(false)
      const aiError = ref('')
      ```
    - Import `swapHorizontalOutline` and `sparklesOutline` from `ionicons/icons` (add to the existing import block)
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ] 9.2 Add `fetchAiAlternatives()` and `toggleAlternatives()` functions
    - Add `fetchAiAlternatives()`:
      - Build query params from `product.value.product_name`, `product.value.brand_name`, and `personalAllergenAlerts.value.join(',')`
      - Call `apiFetch('/api/alternatives/ai-suggest?...')` with GET
      - On success: assign to `aiSuggestions.value`
      - On error: set `aiError.value` with a user-facing message
      - Set `aiLoading.value` true before the call, false in finally
    - Add `toggleAlternatives()`:
      - Flip `showAlternativesSection.value`
      - When opening (value becomes true) and `aiSuggestions.value` is empty and `alternatives.value` is empty and not currently loading: call `fetchAiAlternatives()`
    - _Requirements: 2.4, 2.5_

  - [ ] 9.3 Reset AI alternatives state in the `isOpen` watcher
    - In the existing `watch(() => props.isOpen, ...)` handler, add alongside `resetPantryForm()`:
      ```ts
      showAlternativesSection.value = false
      aiSuggestions.value = []
      aiLoading.value = false
      aiError.value = ''
      ```
    - _Requirements: 2.4_

  - [ ] 9.4 Rework the alternatives section in the template
    - Remove the existing `<div v-if="alternatives.length || alternativesMessage" class="alternatives-section">` block entirely
    - After the `<div v-if="personalAllergenAlerts.length" class="personal-allergen-alert">` block, add a "Show Alternatives" trigger button:
      ```html
      <div v-if="personalAllergenAlerts.length" class="show-alternatives-trigger">
        <button type="button" class="show-alternatives-btn" @click="toggleAlternatives">
          <ion-icon :icon="swapHorizontalOutline" />
          {{ showAlternativesSection ? 'Hide Alternatives' : 'Show Alternatives' }}
        </button>
      </div>
      ```
    - Add the collapsible alternatives section below it:
      ```html
      <div v-if="showAlternativesSection" class="alternatives-section">
        <div class="alternatives-disclaimer">
          Always check the product label before purchasing — suggestions are AI-generated and may not reflect current availability.
        </div>
        <ion-spinner v-if="aiLoading" name="crescent" class="alternatives-spinner" />
        <p v-if="aiError && !aiLoading" class="alternatives-error">{{ aiError }}</p>
        <div v-for="alt in alternatives" :key="alt.id" class="alt-item">
          <div class="alt-item__image-placeholder"><ion-icon :icon="imageOutline" /></div>
          <div class="alt-item__info">
            <p class="alt-item__name">{{ alt.brand_name }} {{ alt.product_name }}</p>
          </div>
        </div>
        <div v-for="sug in aiSuggestions" :key="sug.product_name" class="alt-item alt-item--ai">
          <div class="alt-item__image-placeholder"><ion-icon :icon="sparklesOutline" /></div>
          <div class="alt-item__info">
            <p class="alt-item__name">{{ sug.brand_name }} {{ sug.product_name }}</p>
            <p class="alt-item__desc">{{ sug.reason }}</p>
          </div>
        </div>
        <p v-if="!aiLoading && !aiError && alternatives.length === 0 && aiSuggestions.length === 0" class="alternatives-empty">
          No alternatives found for this product.
        </p>
      </div>
      ```
    - _Bug_Condition: isBugCondition(input) where no Show Alternatives button is rendered_
    - _Expected_Behavior: button visible when personalAllergenAlerts.length > 0; section renders catalog + AI suggestions_
    - _Preservation: button NOT shown when personalAllergenAlerts.length === 0_
    - _Requirements: 2.3, 2.4, 2.5, 3.3, 3.4_

  - [ ] 9.5 Verify bug condition exploration test now passes (Feature 2)
    - **Property 3: Expected Behavior** — Show Alternatives Button Present When Allergen Alert Exists
    - **IMPORTANT**: Re-run the SAME test from task 6 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES — "Show Alternatives" button is rendered when `matched_user_allergens` is non-empty
    - _Requirements: 2.3_

  - [ ] 9.6 Verify preservation tests still pass (Feature 2)
    - **Property 4: Preservation** — No Alternatives Button Without Allergen Alert; Catalog Alternatives Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 7
    - **EXPECTED OUTCOME**: Tests PASS — no button when no allergen alerts; catalog alternatives still render in expanded section
    - _Requirements: 3.3, 3.4_

---

## Feature 3 — Profile Edit Modal Redesign (Halal toggle + WHO checklist)

- [ ] 10. Write bug condition exploration test (Feature 3)
  - **Property 5: Bug Condition** — Halal in Quick-Add and Freetext Input Present
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Confirm 'Halal' is in `quickAddSuggestions` and freetext input exists
  - **Scoped PBT Approach**: In a unit test, assert that the `quickAddSuggestions` array exported/used in `ProfilePage.vue` contains `'Halal'`; mount the edit modal and assert a `<input type="text">` with placeholder "Type a custom preference…" is present in the DOM; assert no `IonToggle` with label "Halal" is present; assert no `.who-allergen-list` element is present
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL — Halal is a chip in quick-add, freetext input is present, WHO checklist is absent
  - Document counterexample: "Halal indistinguishable from allergen chips; arbitrary strings accepted as allergens"
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.4, 1.5_

- [ ] 11. Write preservation property tests — Feature 3 (BEFORE implementing fix)
  - **Property 6: Preservation** — Profile Save Format and Old Chip Removal Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on unfixed code: call `removeCustomPreference('Peanuts-free')` with `form.customPreferences = ['Peanuts-free', 'Milk-free']`; observe resulting array is `['Milk-free']`
  - Observe on unfixed code: `saveProfile()` POSTs `{ halal_pref: true, custom_preferences: ['Milk-free'], allergen_ids: [...] }`; observe shape and endpoint (`PUT /api/users`)
  - Write property-based test: for any `customPreferences` array, after `removeCustomPreference(pref)`, the array does not contain `pref` and all other entries are preserved
  - Write property-based test: `saveProfile()` always calls `PUT /api/users` with keys `halal_pref`, `custom_preferences`, and `allergen_ids`
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline to preserve)
  - _Requirements: 3.5, 3.6_

- [ ] 12. Fix Feature 3 — `omniscan-ui/src/views/ProfilePage.vue` — script changes

  - [ ] 12.1 Add `IonToggle` import and define `WHO_ALLERGENS` constant
    - Add `IonToggle` to the `@ionic/vue` named imports
    - Define the `WHO_ALLERGENS` constant above `quickAddSuggestions`:
      ```ts
      const WHO_ALLERGENS = [
        { label: 'Cereals / Gluten', value: 'Wheat-free' },
        { label: 'Crustaceans', value: 'Shellfish-free' },
        { label: 'Eggs', value: 'Eggs-free' },
        { label: 'Fish', value: 'Fish-free' },
        { label: 'Peanuts', value: 'Peanuts-free' },
        { label: 'Soybeans', value: 'Soy-free' },
        { label: 'Milk / Dairy', value: 'Milk-free' },
        { label: 'Tree Nuts', value: 'TreeNuts-Free' },
        { label: 'Celery', value: 'Celery-free' },
        { label: 'Mustard', value: 'Mustard-free' },
        { label: 'Sesame', value: 'Sesame-free' },
        { label: 'Sulphur Dioxide / Sulphites', value: 'Sulphites-free' },
        { label: 'Lupin', value: 'Lupin-free' },
        { label: 'Molluscs', value: 'Molluscs-free' },
      ]
      ```
    - _Requirements: 2.7_

  - [ ] 12.2 Remove 'Halal' from `quickAddSuggestions` and remove freetext refs/functions
    - Remove `'Halal'` from the `quickAddSuggestions` array
    - Remove the `customPrefDraft` ref declaration
    - Remove the `addCustomPreference()` function
    - Remove the `handleQuickAdd()` function (replaced by direct `addQuickPreference` call or `toggleWhoAllergen`)
    - _Requirements: 2.6, 2.7_

  - [ ] 12.3 Add `toggleWhoAllergen()` function
    - Add the function after `removeCustomPreference`:
      ```ts
      function toggleWhoAllergen(value: string) {
        if (form.customPreferences.includes(value)) {
          form.customPreferences = form.customPreferences.filter((p) => p !== value)
          prefLimitWarning.value = false
        } else {
          if (prefTotal.value >= PREF_MAX) {
            prefLimitWarning.value = true
            return
          }
          form.customPreferences.push(value)
        }
      }
      ```
    - _Requirements: 2.7, 3.5_

  - [ ] 12.4 Clean up `openEditModal()` — remove `customPrefDraft` reset
    - In `openEditModal()`, remove the line `customPrefDraft.value = ''`
    - Remove the line `prefAddError.value = null` if it references the removed freetext state
    - _Requirements: 2.6_

- [ ] 13. Fix Feature 3 — `omniscan-ui/src/views/ProfilePage.vue` — template changes (edit modal)

  - [ ] 13.1 Replace the Halal chip in `chip-row--editable` with a standalone Halal toggle row
    - In the edit modal template, remove the `<span v-if="form.halalPref" class="pref-chip">Halal <ion-icon ... /></span>` from the `chip-row--editable` div
    - Above the `chip-row--editable` div, add:
      ```html
      <div class="halal-toggle-row">
        <div class="halal-toggle-label-block">
          <span class="halal-toggle-label">Halal</span>
          <span class="halal-toggle-sublabel">Religious dietary requirement</span>
        </div>
        <IonToggle v-model="form.halalPref" />
      </div>
      ```
    - _Requirements: 2.6_

  - [ ] 13.2 Remove the freetext input row and quick-add chip section from the template
    - Remove the entire `<div class="custom-pref-input-row">` div (freetext input + "Add" button)
    - Remove the `<p v-if="prefAddError" ...>` error paragraph
    - Remove the `<p class="quick-add-label">Quick add:</p>` paragraph and the `<div class="chip-row">` containing the `quick-add-chip` buttons
    - _Requirements: 2.7_

  - [ ] 13.3 Add the WHO allergen checklist below the editable chip row
    - After the `chip-row--editable` div and the `prefLimitWarning` paragraph, add:
      ```html
      <label class="input-label" style="margin-top: 16px;">Allergens / Allergy List</label>
      <div class="who-allergen-list">
        <label v-for="allergen in WHO_ALLERGENS" :key="allergen.value" class="who-allergen-item">
          <input
            type="checkbox"
            :checked="form.customPreferences.includes(allergen.value)"
            @change="toggleWhoAllergen(allergen.value)" />
          <span>{{ allergen.label }}</span>
        </label>
      </div>
      ```
    - _Bug_Condition: isBugCondition(input) where WHO allergen checklist is absent_
    - _Expected_Behavior: 14-item checklist replaces freetext input_
    - _Preservation: removeCustomPreference still works for chips not in WHO_ALLERGENS_
    - _Requirements: 2.7, 3.5_

  - [ ] 13.4 Verify bug condition exploration test now passes (Feature 3)
    - **Property 5: Expected Behavior** — Dedicated Halal Toggle and WHO Checklist Present
    - **IMPORTANT**: Re-run the SAME test from task 10 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES — `quickAddSuggestions` does not contain 'Halal'; freetext input is absent; `IonToggle` with "Halal" label is present; `.who-allergen-list` renders 14 items
    - _Requirements: 2.6, 2.7_

  - [ ] 13.5 Verify preservation tests still pass (Feature 3)
    - **Property 6: Preservation** — Profile Save Format and Old Chip Removal Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 11
    - **EXPECTED OUTCOME**: Tests PASS — `removeCustomPreference` still works; `saveProfile` still posts same shape
    - _Requirements: 3.5, 3.6_

---

## Feature 4 — Profile Summary Reorganization

- [ ] 14. Write bug condition exploration test (Feature 4)
  - **Property 7: Bug Condition** — Halal and Allergens Under Single Heading
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Confirm Halal and allergens render under a single "Dietary Preferences" heading
  - **Scoped PBT Approach**: Mount `ProfilePage.vue` with `dietary_prof: [{ halal_pref: true, custom_preferences: ['Milk-free'] }]`; assert a single `.pref-summary` block exists with a `section-label` containing "Dietary Preferences:"; assert both "Halal" and "Milk-free" chips appear inside it; assert NO element with text "Religious Preference" exists; assert NO element with text "Allergens / Allergy List" exists
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS — single block with "Dietary Preferences:" is present (confirms bug exists)
  - Document counterexample: "Halal chip and Milk-free chip rendered under a single undifferentiated heading"
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.6_

- [ ] 15. Write preservation property tests — Feature 4 (BEFORE implementing fix)
  - **Property 8: Preservation** — No Summary When No Preferences Set
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on unfixed code: mount `ProfilePage.vue` with `dietary_prof: [{ halal_pref: false, custom_preferences: [] }]` and `allergens: []`; confirm no `.pref-summary` block renders
  - Write property-based test: for any `user` where `halalPref` is false and `displayPreferences` is empty, no summary section is rendered
  - Verify test PASSES on UNFIXED code
  - **EXPECTED OUTCOME**: Test PASSES (confirms baseline to preserve)
  - _Requirements: 3.7_

- [ ] 16. Fix Feature 4 — `omniscan-ui/src/views/ProfilePage.vue` — `displayPreferences` computed and template

  - [ ] 16.1 Filter 'Halal' out of the `displayPreferences` computed
    - In the `displayPreferences` computed, update the returned array to filter out any entry that matches `'halal'` case-insensitively:
      ```ts
      const displayPreferences = computed(() => {
        const custom = user.value.dietary_prof?.[0]?.custom_preferences ?? []
        const filtered = custom.length > 0
          ? custom
          : (user.value.allergens ?? []).map((a) => `${formatAllergenName(a.name)}-free`)
        return filtered.filter((p) => p.toLowerCase() !== 'halal')
      })
      ```
    - _Bug_Condition: isBugCondition(input) where displayPreferences contains Halal_
    - _Requirements: 2.8_

  - [ ] 16.2 Replace the single `pref-summary` block with two conditional sections in the template
    - Remove the existing `<div v-if="halalPref || displayPreferences.length > 0" class="pref-summary">` block
    - Replace with two independent conditional blocks:
      ```html
      <!-- Religious Preference section -->
      <div v-if="halalPref" class="pref-summary">
        <p class="section-label">Religious Preference:</p>
        <div class="chip-row">
          <span class="pref-chip pref-chip--halal">Halal</span>
        </div>
      </div>

      <!-- Allergens / Allergy List section -->
      <div v-if="displayPreferences.length > 0" class="pref-summary">
        <p class="section-label">Allergens / Allergy List:</p>
        <div class="chip-row">
          <span v-for="pref in displayPreferences" :key="pref" class="pref-chip">{{ pref }}</span>
        </div>
      </div>
      ```
    - _Bug_Condition: isBugCondition(input) where both rendered under single 'Dietary Preferences' heading_
    - _Expected_Behavior: separate 'Religious Preference' and 'Allergens / Allergy List' sections_
    - _Preservation: neither section renders when halalPref is false and displayPreferences is empty_
    - _Requirements: 2.8, 3.7_

  - [ ] 16.3 Verify bug condition exploration test now passes (Feature 4)
    - **Property 7: Expected Behavior** — Two Separate Summary Sections
    - **IMPORTANT**: Re-run the SAME test from task 14 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES — "Religious Preference" section with Halal chip and "Allergens / Allergy List" section with Milk-free chip render as two independent blocks
    - _Requirements: 2.8_

  - [ ] 16.4 Verify preservation tests still pass (Feature 4)
    - **Property 8: Preservation** — No Summary When No Preferences Set
    - **IMPORTANT**: Re-run the SAME tests from task 15
    - **EXPECTED OUTCOME**: Test PASSES — no summary blocks render when both `halalPref` is false and `displayPreferences` is empty
    - _Requirements: 3.7_

---

## Final Checkpoint

- [ ] 17. Checkpoint — Ensure all tests pass
  - Run the full test suite covering all four features
  - Confirm all exploration tests (tasks 1, 6, 10, 14) now PASS after their respective fixes
  - Confirm all preservation tests (tasks 2, 7, 11, 15) still PASS
  - Confirm no TypeScript compiler errors in `nitro-app` (`npx tsc --noEmit`)
  - Confirm no Vue type errors in `omniscan-ui` (`npx vue-tsc --noEmit`)
  - Ask the user if any questions arise
