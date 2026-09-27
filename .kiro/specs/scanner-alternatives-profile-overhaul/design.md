# Scanner Alternatives & Profile Overhaul — Bugfix Design

## Overview

This design covers four interconnected features for OmniScan that share a common release:

1. **Real Food / Anti-Cartoon Validation** — The AI vision pipeline for both the scanner and the Photo Pantry upload flow currently validates food vs. non-food but does not distinguish genuine photographs from cartoons, drawings, or digital art. A new `is_real_photo` field is added to both AI extraction interfaces, with prompt instructions and a rejection path that mirrors the existing `is_food_product` rejection.

2. **Show Alternatives Button + AI Endpoint** — When the scan result modal shows personal allergen alerts, no mechanism exists to suggest alternatives for products that are not in the catalog. A new `GET /api/alternatives/ai-suggest` endpoint drives a collapsible "Show Alternatives" section inside `ScanResultModal.vue`. The existing catalog-based alternatives path is preserved and displayed first.

3. **Profile Edit Modal Redesign** — The dietary-preferences section in the profile edit modal conflates Halal (a religious requirement) with allergen choices (a medical/dietary concern) in a single chip list backed by a freetext input. The redesign promotes Halal to a dedicated `IonToggle` row and replaces the freetext chip input and quick-add buttons with a structured WHO 14-allergen checklist.

4. **Profile Summary Reorganization** — The profile summary page reflects the same conceptual split: Halal is shown under a "Religious Preference" heading; structured allergens under "Allergens / Allergy List". The `displayPreferences` computed is updated to exclude "Halal" from the chip row.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs that trigger each defect — a non-photographic image reaching the scan pipeline; an allergen alert with no alternatives UI; Halal mixed with allergen chips in the edit modal; Halal and allergens merged under one heading in the summary.
- **Property (P)**: The correct system behavior when the bug condition is satisfied — rejection with a clear message; a visible "Show Alternatives" button with AI results; a dedicated Halal toggle and WHO checklist; separate summary headings.
- **Preservation**: All existing behaviors that must be unaffected — real-photo scans, non-food 422 errors, catalog-based alternatives, existing `removeCustomPreference` support, `halal_pref` / `custom_preferences` / `allergen_ids` persistence format, profile display when no preferences are set.
- **`ScanAiExtraction`**: The TypeScript interface in `server/api/scan/index.post.ts` that captures every field the vision model returns for the scanner flow.
- **`UploadAiExtraction`**: The TypeScript interface in `server/api/pantry_item/analyze.post.ts` that captures every field the vision model returns for the Photo Pantry upload flow.
- **`buildPrompt()`**: Function in `scan/index.post.ts` that builds the system instruction string sent to `SCAN_VISION_MODEL`.
- **`buildAnalyzePrompt()`**: Function in `analyze.post.ts` that builds the instruction string for the Photo Pantry vision call.
- **`coerceAiExtraction()`**: Type-narrowing function in `scan/index.post.ts` that maps a raw JSON object to `ScanAiExtraction`.
- **`coerceUploadExtraction()`**: Type-narrowing function in `analyze.post.ts` that maps a raw JSON object to `UploadAiExtraction`.
- **`GENERATION_MODEL`**: `deepseek-v4-flash:cloud` — the text-only reasoning model used for alternatives suggestions (defined in `server/lib/ollama-models.ts`).
- **`SCAN_VISION_MODEL`**: `gemma4:cloud` — the vision model used for scan and photo pantry extraction.
- **`personalAllergenAlerts`**: Computed ref in `ScanResultModal.vue` — `props.data?.matched_user_allergens ?? []`.
- **`displayPreferences`**: Computed ref in `ProfilePage.vue` that derives the chip list from `custom_preferences` or mapped allergen names.
- **`WHO_ALLERGENS`**: A constant array of 14 WHO-recognised major food allergens used in the redesigned profile edit modal.

---

## Bug Details

### Feature 1 — Real Food / Anti-Cartoon Validation

#### Bug Condition

The scanner's vision prompt instructs the model to set `is_food_product: false` for non-food items but gives no instruction to distinguish real photographs from non-photographic depictions. The `ScanAiExtraction` and `UploadAiExtraction` interfaces have no `is_real_photo` field, so even if the model returned one it would be silently discarded. The rejection guard in `scan/index.post.ts` only checks `is_food_product`; there is no guard for cartoon/drawing images.

```
FUNCTION isBugCondition(input)
  INPUT: input of type ScannedImage
  OUTPUT: boolean

  RETURN input.imageType IN ['cartoon', 'drawing', 'illustration', 'anime',
                              'digital_art', 'painting', 'sketch', 'app_screenshot']
         AND extraction.is_real_photo field does not exist in the AI response shape
END FUNCTION
```

#### Examples

- A user scans a cartoon cereal box mascot drawing → scan completes and returns full product results.
- A user scans an anime artwork depicting ramen → extract proceeds, no rejection occurs.
- A user uploads a hand-drawn ingredient list illustration to Photo Pantry → `is_food_product` may return true (it depicts food), `nonFoodDetected` stays false, and the item proceeds to step 2.
- A user scans a genuine photo of a real biscuit pack → unchanged — scan completes normally.

---

### Feature 2 — Show Alternatives Button + AI Endpoint

#### Bug Condition

The "Alternatives" section in `ScanResultModal.vue` is always rendered via `v-if="alternatives.length || alternativesMessage"`. When no catalog-matched variants exist, the message "No known alternatives for this product yet." is shown. There is no trigger to fetch AI-generated alternatives, and no `GET /api/alternatives/ai-suggest` endpoint exists.

```
FUNCTION isBugCondition(input)
  INPUT: input of type ScanResult
  OUTPUT: boolean

  RETURN input.matched_user_allergens.length > 0
         AND /api/alternatives/ai-suggest endpoint does not exist
         AND no 'Show Alternatives' UI element is rendered
END FUNCTION
```

#### Examples

- Scan result contains `matched_user_allergens: ['Milk', 'Wheat']` → allergen banner shown, no button to discover safer products.
- Scan result has catalog alternatives (`alternatives.length > 0`) → those are still shown, but no AI layer.
- Scan result has no allergen alerts → "Show Alternatives" button must NOT appear (regression prevention).

---

### Feature 3 — Profile Edit Modal Redesign

#### Bug Condition

`quickAddSuggestions` in `ProfilePage.vue` includes `'Halal'`, which adds it as a plain chip alongside allergen chips when selected. The edit modal has a `customPrefDraft` text input that lets users type arbitrary strings that may not map to any known allergen in `ALLERGEN_TAG_MAP`. There is no structured WHO allergen checklist.

```
FUNCTION isBugCondition(input)
  INPUT: input of type ProfileEditState
  OUTPUT: boolean

  RETURN 'Halal' IN quickAddSuggestions
         AND customPrefDraft freetext input is present
         AND WHO allergen checklist is absent
END FUNCTION
```

#### Examples

- User taps "+ Halal" quick-add chip → Halal appears inside the same chip row as allergen preferences.
- User types "peanut allergy" in the freetext input → this string does not match any key in `ALLERGEN_TAG_MAP`, so no allergen ID is derived and the scan matching logic ignores it.
- User checks "Peanuts" on a structured WHO checklist → the value maps correctly to the catalog allergen via `deriveAllergenIds`.

---

### Feature 4 — Profile Summary Reorganization

#### Bug Condition

`ProfilePage.vue` renders a single `pref-summary` block containing both a "Halal" chip (when `halalPref` is true) and all `displayPreferences` chips under the label "Dietary Preferences:". There is no visual or semantic distinction between a religious requirement and a medical dietary restriction.

```
FUNCTION isBugCondition(input)
  INPUT: input of type ProfileSummaryState
  OUTPUT: boolean

  RETURN halalPref = true
         AND displayPreferences contains allergen chips
         AND both are rendered under a single 'Dietary Preferences' heading
END FUNCTION
```

#### Examples

- User has Halal and Milk-free set → both appear in one row under "Dietary Preferences:".
- User has only Halal set → "Dietary Preferences: Halal" — no indication that this is a religious preference.
- User has no preferences → no summary section shown (must be preserved).

---

## Expected Behavior

### Preservation Requirements

The following behaviors are explicitly out of scope for any change:

- **Real-photo scans** (`is_real_photo: true`) must proceed through the full extraction pipeline without any interruption, additional API calls, or changed response shape.
- **Non-food 422** (`is_food_product: false`) must continue to be thrown before the `is_real_photo` check fires, so the check ordering is: `is_food_product` first, then `is_real_photo`.
- **`GET /api/alternatives/index.get.ts`** must remain unchanged — catalog-based alternatives are still fetched and displayed first inside the redesigned section.
- **"Show Alternatives" button** must NOT appear when there are no personal allergen alerts (`personalAllergenAlerts.length === 0`).
- **`removeCustomPreference(pref)`** must continue to work for chips that were set via the old freetext input and are stored in `custom_preferences`.
- **Profile save** must persist `halal_pref`, `custom_preferences`, and `allergen_ids` in the same format and to the same API endpoint as before.
- **Profile page with no preferences** must render no summary section — `v-if="halalPref || displayPreferences.length > 0"` logic (adapted for the split layout) must still gate the sections correctly.

---

## Hypothesized Root Causes

### Feature 1

1. **Missing prompt instruction** — `buildPrompt()` and `buildAnalyzePrompt()` describe valid food vs. non-food but have no sentence instructing the model to consider image type (photograph vs. illustration). The model has no signal to produce `is_real_photo`.
2. **Missing interface field** — Neither `ScanAiExtraction` nor `UploadAiExtraction` declares `is_real_photo: boolean`, so `coerceAiExtraction` / `coerceUploadExtraction` do not include it even if the model returns it.
3. **Missing rejection guard** — `scan/index.post.ts` only checks `if (!extraction.is_food_product)` before proceeding. `analyze.post.ts` only checks `if (!extraction.is_food_product)` before running allergen matching.
4. **Missing UI message variant** — `PhotoPantryUploadModal.vue` has a single hardcoded string in the `.nonfood-alert` div. Cartoon rejection requires a distinct, user-facing message.

### Feature 2

1. **Missing endpoint** — No file exists at `server/api/alternatives/ai-suggest.get.ts`.
2. **No UI trigger** — `ScanResultModal.vue` has no button to initiate an AI alternatives request; the alternatives section is a static block.
3. **No loading/error state** — There are no refs for `aiLoading`, `aiError`, or `aiSuggestions` in the component.

### Feature 3

1. **Halal in quick-add list** — `quickAddSuggestions` contains `'Halal'`, which mixes a religious preference with allergen data.
2. **Freetext input** — `customPrefDraft` / `addCustomPreference` allows arbitrary strings that bypass `ALLERGEN_TAG_MAP` and produce no allergen ID match.
3. **No structured allergen UI** — There is no `WHO_ALLERGENS` constant or checklist component; allergen selection is entirely ad-hoc.

### Feature 4

1. **Single pref-summary block** — The template has one `<div class="pref-summary">` that wraps both Halal and allergen chips with a single "Dietary Preferences:" label.
2. **`displayPreferences` includes Halal** — The computed does not exclude `'Halal'` from the chip list (it may be stored in `custom_preferences` for older accounts).

---

## Correctness Properties

Property 1: Bug Condition — Non-Photographic Image Rejection

_For any_ image where `isBugCondition` holds (the AI determines `is_real_photo: false`) and `is_food_product: true`, the fixed scanner SHALL reject the request with HTTP 422 and the message "Please scan a real photo of a food product — cartoons, drawings, and illustrations are not supported." The fixed Photo Pantry upload flow SHALL set `nonFoodDetected` to true and display "Cartoons and drawings are not supported. Please upload a real photo of a food item."

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Real Photos and Non-Food Rejection Are Unaffected

_For any_ image where `isBugCondition` does NOT hold (the image is a genuine photograph, or `is_food_product` is false), the fixed scan and upload pipelines SHALL produce exactly the same result as the original code. Non-food 422 errors fire before the `is_real_photo` check; real-photo scans complete with an identical response shape.

**Validates: Requirements 3.1, 3.2**

Property 3: Bug Condition — AI Alternatives Available on Allergen Alert

_For any_ scan result where `personalAllergenAlerts.length > 0`, the fixed `ScanResultModal` SHALL render a "Show Alternatives" button. When pressed (and no results are cached), it SHALL call `GET /api/alternatives/ai-suggest` and display the returned suggestions with `product_name`, `brand_name`, and `reason`.

**Validates: Requirements 2.3, 2.4, 2.5, 2.9**

Property 4: Preservation — No Alternatives Button Without Allergen Alert

_For any_ scan result where `personalAllergenAlerts.length === 0`, the fixed `ScanResultModal` SHALL NOT render the "Show Alternatives" button. Catalog-based alternatives continue to be fetched and displayed by the existing alternatives section logic.

**Validates: Requirements 3.3, 3.4**

Property 5: Bug Condition — Structured Profile Edit Separates Halal and Allergens

_For any_ state where the profile edit modal is open, the fixed `ProfilePage` SHALL render a dedicated Halal toggle row (not a chip in the allergen list) and a WHO 14-allergen checklist (not a freetext input). "Halal" SHALL NOT appear in `quickAddSuggestions`.

**Validates: Requirements 2.6, 2.7**

Property 6: Preservation — Profile Save Format and Old Chip Removal Unchanged

_For any_ profile save action, the fixed `ProfilePage` SHALL persist `halal_pref`, `custom_preferences`, and `allergen_ids` to the API in the same format as before. `removeCustomPreference` SHALL continue to remove previously stored freetext chips.

**Validates: Requirements 3.5, 3.6**

Property 7: Bug Condition — Profile Summary Split Into Two Sections

_For any_ profile summary render where `halalPref` is true or `displayPreferences.length > 0`, the fixed `ProfilePage` SHALL display Halal under a "Religious Preference" heading and allergen preferences under an "Allergens / Allergy List" heading as two independent sections.

**Validates: Requirements 2.8**

Property 8: Preservation — No Summary When No Preferences Set

_For any_ profile summary render where `halalPref` is false and `displayPreferences.length === 0`, the fixed `ProfilePage` SHALL continue to render no summary section at all.

**Validates: Requirements 3.7**

---

## Fix Implementation

### Feature 1 — `server/api/scan/index.post.ts`

**Interface change (`ScanAiExtraction`):**
- Add `is_real_photo: boolean` after `is_food_product: boolean`.

**`buildPrompt()` changes:**
- Append `"is_real_photo": boolean` to the JSON shape string, after `"net_unit": string | null`.
- Append the instruction: `'"is_real_photo" must be true ONLY when the image is a genuine real-world photograph of a physical food product. Set is_real_photo to false for cartoons, drawings, illustrations, anime, digital art, paintings, sketches, screenshots of apps, or any non-photographic depiction — even if it shows food.'`

**`coerceAiExtraction()` change:**
- Add `is_real_photo: normalizeToBoolean(candidate.is_real_photo)` to the returned object.

**Rejection guard (after the `is_food_product` check):**
```ts
if (!extraction.is_real_photo) {
  throw createError({
    statusCode: 422,
    statusMessage: 'Please scan a real photo of a food product — cartoons, drawings, and illustrations are not supported.',
  })
}
```

---

### Feature 1 — `server/api/pantry_item/analyze.post.ts`

**Interface change (`UploadAiExtraction`):**
- Add `is_real_photo: boolean` after `is_food_product: boolean`.

**`buildAnalyzePrompt()` changes:**
- Append `"is_real_photo": boolean` to the JSON shape string.
- Append the instruction: `'"is_real_photo" must be true only for genuine real-world photographs. Set to false for cartoons, drawings, illustrations, digital art, or any non-photographic image.'`

**`coerceUploadExtraction()` change:**
- Add `is_real_photo: typeof c.is_real_photo === 'boolean' ? c.is_real_photo : true` (safe default: treat unknown as real photo to avoid false rejections in the upload flow).

**Non-food early return change:**
- Widen the condition to `if (!extraction.is_food_product || !extraction.is_real_photo)` and include `is_real_photo` in the returned object so the Vue component can distinguish the two cases.

---

### Feature 1 — `omniscan-ui/src/components/PhotoPantryUploadModal.vue`

**Script changes:**
- Add `const nonFoodMessage = ref('')`.
- Add `is_real_photo?: boolean` to the local `AnalyzeResult` interface.
- In `goToStep2()`, replace the `if (!result.is_food_product)` block with a check on both `is_food_product` and `is_real_photo`, setting `nonFoodMessage.value` to the appropriate string for each case.
- In `resetAll()`, add `nonFoodMessage.value = ''`.

**Template change:**
- Replace the hardcoded text inside `.nonfood-alert` with `{{ nonFoodMessage || 'Non-food product detected.' }}`.

---

### Feature 2 — New file: `server/api/alternatives/ai-suggest.get.ts`

- `requireAuth(event)` — endpoint requires authentication.
- Read `product_name`, `brand_name`, `user_allergens` from query string via `getQuery(event)`.
- Return 400 if `product_name` is absent.
- Build a structured prompt targeting Indian and Southeast Asian markets, instructing the model to return a JSON array of `{ product_name, brand_name, reason }` objects (3–5 items) or `[]` if none exist.
- Call `GENERATION_MODEL` via `OLLAMA_ENDPOINT` with `format: 'json'`.
- Parse response with `stripCodeFences`, filter to valid non-empty objects, return `{ suggestions }`.
- Throw 502 on upstream fetch failure.

---

### Feature 2 — `omniscan-ui/src/components/ScanResultModal.vue`

**New refs:**
- `showAlternativesSection: ref(false)`
- `aiSuggestions: ref<{product_name:string, brand_name:string, reason:string}[]>([])`
- `aiLoading: ref(false)`
- `aiError: ref('')`

**New functions:**
- `fetchAiAlternatives()` — builds query params from `product.value` and `personalAllergenAlerts.value`, calls `/api/alternatives/ai-suggest`, populates `aiSuggestions` or `aiError`.
- `toggleAlternatives()` — flips `showAlternativesSection`; triggers `fetchAiAlternatives()` on first open when no results are cached from either catalog or AI.

**Template changes:**
- Remove the existing `v-if="alternatives.length || alternativesMessage"` alternatives block.
- After the `personal-allergen-alert` div, add a `v-if="personalAllergenAlerts.length"` trigger button using `toggleAlternatives`.
- Add a `v-if="showAlternativesSection"` expanded section that shows:
  - A disclaimer banner ("always check the label").
  - A loading spinner or error message.
  - Catalog alternatives (`v-for="alt in alternatives"`) first.
  - AI suggestions (`v-for="sug in aiSuggestions"`) with `.alt-item--ai` styling, showing `reason` in a sub-line.
  - Empty state when both lists are empty and not loading.

**`isOpen` watcher reset:**
- Add `showAlternativesSection.value = false`, `aiSuggestions.value = []`, `aiLoading.value = false`, `aiError.value = ''` alongside the existing `resetPantryForm()` call.

**New icons to import:**
- `swapHorizontalOutline`, `sparklesOutline` from `ionicons/icons`.

---

### Feature 3 — `omniscan-ui/src/views/ProfilePage.vue`

**Script changes:**
- Add `IonToggle` to `@ionic/vue` imports.
- Define `WHO_ALLERGENS` constant: 14 entries, each `{ label: string, value: string }`, covering Cereals/Gluten, Crustaceans, Eggs, Fish, Peanuts, Soybeans, Milk/Dairy, Tree Nuts, Celery, Mustard, Sesame, Sulphur Dioxide/Sulphites, Lupin, Molluscs.
- Add `toggleWhoAllergen(value: string)` — adds the value to `form.customPreferences` if absent, removes it if present, respects the `PREF_MAX` cap.
- Remove `'Halal'` from `quickAddSuggestions`.
- Remove `customPrefDraft` ref, `addCustomPreference` function.

**Template changes (edit modal):**
- Remove the `custom-pref-input-row` div (freetext input + "Add" button).
- Remove the quick-add chip-buttons section (`<p class="quick-add-label">` and its `chip-row`).
- Replace the Halal chip inside `chip-row--editable` with a standalone `halal-toggle-row` containing an `IonToggle` bound to `form.halalPref`, labelled "Halal" with sublabel "Religious dietary requirement".
- Below the existing editable chip row (which now only shows `customPreferences` chips with remove icons), add an "Allergens / Allergy List" label and a `.who-allergen-list` containing one `.who-allergen-item` per entry in `WHO_ALLERGENS`, each with a checkbox (`<input type="checkbox">`) and label.

---

### Feature 4 — `omniscan-ui/src/views/ProfilePage.vue`

**`displayPreferences` computed:**
- Filter out `'Halal'` (case-insensitive) from the returned array, so it never appears in the allergen chip row regardless of how the data was stored.

**Template changes (profile summary):**
- Replace the single `pref-summary` block with two conditional blocks:
  1. `v-if="halalPref"` — heading "Religious Preference", single chip with `.pref-chip--halal` styling.
  2. `v-if="displayPreferences.length > 0"` — heading "Allergens / Allergy List", chip row.

---

## Testing Strategy

### Validation Approach

The four features share a two-phase approach: first run tests on the **unfixed code** to surface failures that confirm the bug condition; then implement the fix and verify both the new behavior and the preservation of existing behavior.

---

### Exploratory Bug Condition Checking (Run on Unfixed Code)

**Goal**: Confirm the bug condition is real. Each test should fail on unfixed code, documenting the counterexample.

**Feature 1 — Scan API:**
1. POST a request to `scan/index.post.ts` with a mocked AI response where `is_food_product: true` and `is_real_photo: false` → **expect**: test passes through without 422 (counterexample: cartoon images are accepted).
2. POST to `pantry_item/analyze.post.ts` with the same mock → **expect**: non-food early return does not trigger; `is_real_photo` field is absent from the response (counterexample: cartoon images are accepted in Photo Pantry).

**Feature 2 — Alternatives UI:**
3. Render `ScanResultModal.vue` with `matched_user_allergens: ['Milk']` → **expect**: no "Show Alternatives" button in the DOM (counterexample: there is no way to request AI alternatives).

**Feature 3 — Profile Edit:**
4. Inspect `quickAddSuggestions` for `'Halal'` → **expect**: it is present (counterexample: Halal is selectable as an allergen chip).
5. Confirm `customPrefDraft` ref and freetext input exist in the template → **expect**: freetext input is present (counterexample: arbitrary strings can be entered as allergens).

**Feature 4 — Profile Summary:**
6. Render `ProfilePage.vue` with `halalPref: true` and `displayPreferences: ['Milk-free']` → **expect**: both are under a single heading "Dietary Preferences" (counterexample: no visual distinction between religious and medical preferences).

---

### Fix Checking (Run on Fixed Code)

**Goal**: Verify each bug condition now produces the correct behavior.

**Feature 1:**
- Unit: `coerceAiExtraction({ is_food_product: true, is_real_photo: false, ... })` → `is_real_photo: false`.
- Unit: Handler throws 422 with the cartoon rejection message when `is_real_photo` is false.
- Unit: `coerceUploadExtraction({ is_food_product: true, is_real_photo: false, ... })` → `is_real_photo: false`.
- Unit: `analyze.post.ts` returns early object including `is_real_photo: false` when input is cartoon.
- Component: `goToStep2()` in `PhotoPantryUploadModal` sets `nonFoodDetected = true` and `nonFoodMessage` to the cartoon string when `result.is_real_photo === false`.

**Feature 2:**
- Unit: `GET /api/alternatives/ai-suggest` with a valid `product_name` returns `{ suggestions: [...] }`.
- Unit: Returns 400 when `product_name` is absent.
- Unit: Returns `{ suggestions: [] }` when the AI returns an empty array.
- Component: `ScanResultModal` with allergen alerts renders the "Show Alternatives" button.
- Component: Pressing "Show Alternatives" triggers `fetchAiAlternatives()` when no results are cached.

**Feature 3:**
- Unit: `toggleWhoAllergen('Peanuts')` adds 'Peanuts' to `form.customPreferences`.
- Unit: Calling `toggleWhoAllergen('Peanuts')` twice restores the original state.
- Component: WHO checklist renders 14 items.
- Component: Halal toggle row is present; no freetext input is present.

**Feature 4:**
- Unit: `displayPreferences` computed excludes `'Halal'` even when it exists in `custom_preferences`.
- Component: With `halalPref: true`, a "Religious Preference" section renders with a Halal chip.
- Component: With `displayPreferences: ['Milk-free']`, an "Allergens / Allergy List" section renders.

---

### Preservation Checking (Verify Unchanged Behavior)

**Goal**: Confirm no regressions were introduced.

**Feature 1:**
- Real-photo scan (`is_real_photo: true`) proceeds with identical extraction and response shape.
- Non-food image (`is_food_product: false`) still throws 422 with the non-food message, checked before the `is_real_photo` guard.
- `coerceUploadExtraction` defaults `is_real_photo` to `true` when the field is absent (safe default).

**Feature 2:**
- `GET /api/alternatives/index.get.ts` is unchanged and returns catalog alternatives as before.
- When `personalAllergenAlerts.length === 0`, no "Show Alternatives" button appears.
- Catalog alternatives continue to render first inside the expanded section.

**Feature 3:**
- `removeCustomPreference(pref)` still removes a chip from `form.customPreferences` for old freetext data.
- `saveProfile()` still POSTs `halal_pref`, `custom_preferences`, and `allergen_ids` in the same structure.
- The `PREF_MAX` cap continues to apply through `toggleWhoAllergen`.

**Feature 4:**
- When `halalPref` is false and `displayPreferences` is empty, no summary section renders.
- When only allergens are set (no Halal), only the "Allergens / Allergy List" section renders; the "Religious Preference" section is absent.

---

### Unit Tests

- `coerceAiExtraction` with `is_real_photo: false` → returns `is_real_photo: false`.
- `coerceAiExtraction` with no `is_real_photo` field → returns `is_real_photo: false` (strict `normalizeToBoolean`).
- `coerceUploadExtraction` with no `is_real_photo` field → returns `is_real_photo: true` (safe default).
- `ai-suggest.get.ts` handler: happy path, missing `product_name`, empty AI array, upstream 502.
- `toggleWhoAllergen`: add, remove, PREF_MAX enforcement.
- `displayPreferences` computed: excludes 'Halal', excludes case variants.

### Property-Based Tests

- **Property 1**: For all images where the mock returns `{ is_food_product: true, is_real_photo: false }`, the fixed scan handler throws 422 with the cartoon message.
- **Property 2**: For all images where the mock returns `{ is_food_product: true, is_real_photo: true }`, the fixed scan handler does not throw 422 and returns a response with the same shape as before.
- **Property 3**: For all non-empty `product_name` strings and any `user_allergens` string, `ai-suggest.get.ts` returns `{ suggestions: [...] }` where every item has non-empty `product_name` and `brand_name`.
- **Property 4**: For all `customPreferences` arrays that include `'Halal'` (any casing), `displayPreferences` does not include `'Halal'`.

### Integration Tests

- Full scan flow with a mocked cartoon image: API returns 422; scanner UI shows the rejection message.
- Full scan flow with a mocked real food photo: scan completes, result modal opens, no regression.
- Scan result modal with allergen alert: "Show Alternatives" button visible; click fetches AI suggestions and renders them below catalog alternatives.
- Profile edit: open modal, toggle Halal, check a WHO allergen, save; profile summary shows two separate sections with correct content.
- Profile edit: remove an old freetext chip; save; chip is absent from summary.
