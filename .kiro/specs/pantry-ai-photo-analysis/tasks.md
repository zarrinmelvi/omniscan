# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Pantry Analyze Endpoint Returns Well-Formed Extraction
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the gap (no endpoint, synchronous goToStep2)
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — a valid authenticated multipart POST to `/api/pantry_item/analyze` with a real image buffer, for any image content
  - From Bug Condition in design: `isBugCondition(input)` where `input.photo IS NOT NULL AND input.userIsAuthenticated = true AND input.remainingUploads > 0 AND goToStep2() DID NOT call /api/pantry_item/analyze`
  - Test that `POST /api/pantry_item/analyze` with a valid image returns HTTP 200 (not 404) and a well-formed `UploadAiExtraction` body (`is_food_product` boolean, `product_name` string, `expiration_date` YYYY-MM-DD or null, `ingredients_text` string)
  - Also test that calling `goToStep2()` on the unfixed `PhotoPantryUploadModal.vue` triggers a `fetch` to `/api/pantry_item/analyze` — assert fetch was called with a `FormData` body containing an `image` field
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL — `/api/pantry_item/analyze` returns 404 (file doesn't exist yet); `goToStep2()` never calls `fetch` (it is synchronous)
  - Document counterexamples found (e.g., "`POST /api/pantry_item/analyze` → 404 Not Found"; "`goToStep2()` completes synchronously with no network request"; "`nonFoodDetected` is never set to `true` regardless of image content")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Date Parsing Behavior and handleSubmit Contract Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code first, record outputs, then write assertions
  - **Observation step 1 — date-parse round-trip**: Run `normalizeToDateStringOrNull` as currently inlined in `scan/index.post.ts` on a wide set of date strings (e.g., `"31 DEC 2026"` → `"2026-12-31"`, `"12/31/2026"` → `"2026-12-31"`, `"2026.12.31"` → `"2026-12-31"`, `"12/2026"` → `"2026-12-01"`, `"12/26"` → `"2026-12-01"`, `""` → `null`, `"NOT A DATE"` → `null`, `"02/30/2026"` → `null`)
  - **Observation step 2 — handleSubmit body**: Submit the pantry form with `form.ingredientsText` set to a non-empty string; observe that the POST body sent to `/api/pantry_item` does NOT contain `ingredientsText` or `ingredients_text` (key is absent entirely)
  - **Write PBT — date-parse equivalence**: For any string generated from random digits, slashes, hyphens, dots, spaces, and month abbreviations (arbitrarily composed), assert that `normalizeToDateStringOrNull` (post-extraction from `lib/date-parse.ts`) returns the same value as the original inlined implementation
  - **Write PBT — handleSubmit body contract**: For any `form` state with any `ingredientsText` value, assert the body argument passed to `apiFetch('/api/pantry_item', …)` contains no key named `ingredientsText` or `ingredients_text`
  - **Write PBT — button disabled logic**: For any combination of `(previewUrl: boolean, remainingUploads: number, isAnalyzing: boolean, nonFoodDetected: boolean)`, assert the Continue button's `disabled` attribute equals `!previewUrl || remainingUploads <= 0 || isAnalyzing || nonFoodDetected`
  - Verify all preservation tests PASS on UNFIXED code (the logic they guard already exists or the absence they assert is already true)
  - **EXPECTED OUTCOME**: Tests PASS — baseline behavior confirmed before any code changes
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 1.3 (date-parse), 4.3, 3.2, 3.4_

- [ ] 3. Extract date-parsing utilities to shared lib

  - [ ] 3.1 Create `nitro-app/server/lib/date-parse.ts`
    - Copy `MONTH_NAMES`, `isValidYMD`, `tryParseRawDateString`, `normalizeToDateStringOrNull` verbatim from `scan/index.post.ts`
    - Export all four symbols
    - Change `console.warn` tag from `'[scan]'` to `'[date-parse]'` in `normalizeToDateStringOrNull`
    - No other logic changes — pure extraction
    - _Bug_Condition: date helpers are inlined and unexported, blocking reuse in the new endpoint_
    - _Expected_Behavior: all four symbols exported from `lib/date-parse.ts` with identical logic_
    - _Preservation: `normalizeToDateStringOrNull` must return the same value for every input as the original inlined version_
    - _Requirements: implied by scan/index.post.ts preservation (Property 4 in design)_

  - [ ] 3.2 Update `nitro-app/server/api/scan/index.post.ts`
    - Add import: `import { MONTH_NAMES, isValidYMD, tryParseRawDateString, normalizeToDateStringOrNull } from '../../lib/date-parse'`
    - Remove the four inlined declarations (`MONTH_NAMES` constant, `isValidYMD` function, `tryParseRawDateString` function, `normalizeToDateStringOrNull` function)
    - All call sites remain identical — no other changes
    - _Bug_Condition: same as 3.1 — inlined declarations block sharing_
    - _Preservation: scan endpoint behavior must be unchanged; all existing tests must pass without modification_
    - _Requirements: implied by scan/index.post.ts preservation_

- [ ] 4. Create `nitro-app/server/api/pantry_item/analyze.post.ts`

  - [ ] 4.1 Add imports, interfaces, and prompt builder
    - Imports: `defineEventHandler`, `readMultipartFormData`, `createError` from `'h3'`; `requireAuth` from `'../../utils/requireAuth'`; `OLLAMA_ENDPOINT`, `SCAN_VISION_MODEL` from `'../../lib/ollama-models'`; `stripCodeFences` from `'../../lib/ai-json'`; `normalizeToDateStringOrNull` from `'../../lib/date-parse'`
    - Define inline interfaces: `OllamaChatMessage`, `OllamaChatRequestBody`, `OllamaChatResponse` (structural types for Ollama API shape — duplication from scan is acceptable)
    - Define `UploadAiExtraction` interface: `{ is_food_product: boolean; product_name: string; expiration_date: string | null; ingredients_text: string }`
    - Implement `buildAnalyzePrompt()` returning the focused food-label analysis prompt requesting only the four `UploadAiExtraction` fields
    - Implement `coerceUploadExtraction(parsed: unknown): UploadAiExtraction | null` helper that normalizes booleans, strings, and calls `normalizeToDateStringOrNull` on `expiration_date`
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ] 4.2 Implement handler with auth, validation, and Ollama call
    - Step 1: `requireAuth(event)` — throws 401 if unauthenticated (_Requirements: 1.1_)
    - Step 2: `readMultipartFormData(event)` — throw `createError({ statusCode: 400 })` if null (_Requirements: 1.2_)
    - Step 3: find `image` field — throw `createError({ statusCode: 400 })` if absent (_Requirements: 1.2_)
    - Step 4: convert image buffer to base64 string
    - Step 5: call `$fetch<OllamaChatResponse>(OLLAMA_ENDPOINT, { method: 'POST', body: requestBody })` — catch and throw `createError({ statusCode: 502 })` on network error (_Requirements: 1.6_)
    - Step 6: extract `rawContent` from response — throw `createError({ statusCode: 502 })` if empty (_Requirements: 1.7_)
    - Step 7: `JSON.parse(stripCodeFences(rawContent))` — catch and throw `createError({ statusCode: 502 })` on parse failure (_Requirements: 1.7_)
    - Step 8: `coerceUploadExtraction(parsed)` — normalize types
    - Step 9: if `!extraction.is_food_product`, return HTTP 200 with `{ is_food_product: false, product_name: "", expiration_date: null, ingredients_text: "" }` — do NOT throw (_Requirements: 1.5_)
    - Step 10: return HTTP 200 with the coerced extraction (_Requirements: 1.4_)
    - _Bug_Condition: isBugCondition(input) — photo IS NOT NULL AND userIsAuthenticated = true AND remainingUploads > 0_
    - _Expected_Behavior: HTTP 200 with well-formed UploadAiExtraction JSON; expiration_date normalized to YYYY-MM-DD or null_
    - _Preservation: does not affect /api/scan or /api/pantry_item routes_
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [ ] 5. Update `omniscan-ui/src/components/PhotoPantryUploadModal.vue`

  - [ ] 5.1 Add script additions (imports, constants, interfaces, refs, form field)
    - Add import: `API_BASE_URL` from `'@/utils/api'` (keep existing `apiFetch` import — still used in `checkDailyUploadLimit` and `handleSubmit`)
    - Add constant: `const TOKEN_KEY = 'omniscan_token'`
    - Add interface: `AnalyzeResult { is_food_product: boolean; product_name: string; expiration_date: string | null; ingredients_text: string }`
    - Add refs: `const selectedFile = ref<File | null>(null)`, `const isAnalyzing = ref(false)`, `const nonFoodDetected = ref(false)`
    - Add `ingredientsText: ''` to the reactive `form` object — display-only, never sent to `/api/pantry_item`
    - _Requirements: 2.1, 2.2, 2.4, 4.1, 4.3_

  - [ ] 5.2 Update `onFileSelected()` to capture File and reset state
    - Assign `selectedFile.value = file` (before or after creating the preview URL) so `goToStep2()` has access to the raw `File` object for `FormData`
    - Add `nonFoodDetected.value = false` at the top of the handler to clear stale non-food state on new selection
    - _Bug_Condition: selectedFile ref is absent — goToStep2() cannot build FormData without the raw File_
    - _Requirements: 3.3_

  - [ ] 5.3 Replace `goToStep2()` with async version
    - Convert to `async function goToStep2(): Promise<void>`
    - Guard: `if (!previewUrl.value || remainingUploads.value <= 0) return`
    - Set `nonFoodDetected.value = false` and `isAnalyzing.value = true`
    - Build `FormData`, append `selectedFile.value` as `'image'` field
    - Call `fetch(`${API_BASE_URL}/api/pantry_item/analyze`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })` — use native `fetch()`, not `apiFetch` (apiFetch is incompatible with FormData — it forces `Content-Type: application/json`)
    - On non-2xx or catch: set `isAnalyzing.value = false`, set `step.value = 2` (graceful degradation — req 2.5)
    - On 2xx + `result.is_food_product === false`: set `nonFoodDetected.value = true`, do NOT advance step (req 2.4)
    - On 2xx + `result.is_food_product === true`: pre-fill `form.productName`, `form.expirationDate`, `form.ingredientsText` (skip empty/null fields), set `step.value = 2` (req 2.3)
    - Always set `isAnalyzing.value = false` in `finally`
    - _Bug_Condition: goToStep2() is synchronous and never calls /api/pantry_item/analyze_
    - _Expected_Behavior: async goToStep2 calls analyze, pre-fills form on food, blocks on non-food, degrades gracefully on error_
    - _Preservation: apiFetch usage in handleSubmit and checkDailyUploadLimit is unchanged; no new fields added to handleSubmit POST body_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 5.4 Update `resetAll()` to reset new state
    - Add resets: `isAnalyzing.value = false`, `nonFoodDetected.value = false`, `selectedFile.value = null`, `form.ingredientsText = ''`
    - _Requirements: implied by full reset contract_

  - [ ] 5.5 Update template — step 1 non-food alert and Continue button
    - Add non-food alert banner before the Continue button: `<div v-if="nonFoodDetected" class="nonfood-alert">Non-food product detected. Only edible food items can be added to your pantry.</div>` (_Requirements: 3.1_)
    - Update Continue button: add `:disabled="!previewUrl || remainingUploads <= 0 || isAnalyzing || nonFoodDetected"` (_Requirements: 3.2, 3.4_)
    - Update Continue button content: add `<ion-spinner v-if="isAnalyzing" name="crescent" slot="start" />` and change label to `{{ isAnalyzing ? 'Analyzing…' : 'Continue' }}` (_Requirements: 2.2_)
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4_

  - [ ] 5.6 Update template — step 2 ingredients display
    - Add below existing form fields: `<div v-if="form.ingredientsText" class="ingredients-display"><label class="field-label-brown">Detected Ingredients</label><p class="ingredients-text-readonly">{{ form.ingredientsText }}</p></div>` (_Requirements: 4.1, 4.2_)
    - _Requirements: 4.1, 4.2_

  - [ ] 5.7 Add new CSS classes
    - `.nonfood-alert`: red-toned alert (`background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 10px; padding: 10px 14px; font-size: 0.825rem; font-weight: 500; margin: 10px 0`)
    - `.ingredients-display`: gray card (`background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; margin: 12px 0`)
    - `.ingredients-text-readonly`: readable text (`font-size: 0.825rem; color: #374151; line-height: 1.5; margin: 4px 0 0; white-space: pre-wrap`)
    - _Requirements: 3.1, 4.1_

- [ ] 6. Verify bug condition exploration test now passes
  - **Property 1: Expected Behavior** - Pantry Analyze Endpoint Returns Well-Formed Extraction
  - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
  - The tests from task 1 encode the expected behavior (HTTP 200 with well-formed `UploadAiExtraction`; `goToStep2()` calls fetch with FormData)
  - Run all bug condition tests from step 1 against the FIXED code
  - **EXPECTED OUTCOME**: Tests PASS — `/api/pantry_item/analyze` exists and returns correctly shaped responses; `goToStep2()` performs the async fetch
  - Confirm non-food path: mock Ollama returning `is_food_product: false` → assert `step.value` stays at 1 and `nonFoodDetected === true`
  - Confirm food path: mock Ollama returning `is_food_product: true` with sample data → assert `step.value === 2`, `form.productName` pre-filled, `form.expirationDate` pre-filled
  - Confirm graceful degradation: mock fetch throwing → assert `step.value === 2`, form fields blank
  - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.3, 2.4, 2.5_

- [ ] 7. Verify preservation tests still pass
  - **Property 2: Preservation** - Date Parsing Behavior and handleSubmit Contract Unchanged
  - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
  - Run all preservation property tests from step 2 against the FIXED code
  - **EXPECTED OUTCOME**: Tests PASS — no regressions introduced
  - Confirm `normalizeToDateStringOrNull` (extracted) returns the same values as the original for all generated inputs
  - Confirm `handleSubmit()` POST body contains no `ingredientsText` or `ingredients_text` key for any form state
  - Confirm Continue button disabled logic matches `!previewUrl || remainingUploads <= 0 || isAnalyzing || nonFoodDetected` for all state combinations
  - Confirm the existing scan integration tests still pass after extracting date helpers from `scan/index.post.ts`
  - _Requirements: 1.3 (date-parse), 4.3, 3.2, 3.4_

- [ ] 8. Checkpoint — Ensure all tests pass
  - Run the full test suite (unit + property-based + integration)
  - Confirm all tests pass; ask the user if any questions arise
  - Specifically verify:
    - `POST /api/pantry_item/analyze` — 400 on missing image, 401 on no auth, 502 on Ollama failure, 200 on food, 200 on non-food
    - `POST /api/scan` — all existing tests unchanged after date-parse extraction
    - `PhotoPantryUploadModal` — isAnalyzing spinner, nonFoodDetected alert, graceful degradation, resetAll clears all new state
    - `handleSubmit` — POST body to `/api/pantry_item` never contains `ingredientsText` or `ingredients_text`
