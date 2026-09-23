# Pantry AI Photo Analysis — Design

## Overview

The pantry upload flow currently navigates straight from step 1 (photo selection) to step 2 (manual form entry) without performing any analysis on the photo. This feature adds an AI-powered analysis step between the two: when the user taps "Continue," the client sends the selected photo to a new backend endpoint (`POST /api/pantry_item/analyze`), which calls the Gemma4:cloud vision model through the existing Ollama infrastructure, and returns structured extraction data.

The fix has two correctness obligations:

1. **Bug condition**: for every request that reaches the new endpoint with a valid image, the AI extraction pipeline must fire and return a well-formed response.
2. **Preservation**: every code path that does NOT go through the new endpoint (existing scan flow, existing pantry submission, non-analyze routes) must be completely unaffected by the changes.

Four files are touched:
- `nitro-app/server/lib/date-parse.ts` — **NEW**: shared date-parsing utilities extracted from `scan/index.post.ts`.
- `nitro-app/server/api/pantry_item/analyze.post.ts` — **NEW**: the AI analysis endpoint.
- `nitro-app/server/api/scan/index.post.ts` — **UPDATE**: remove inline date helpers and import from `date-parse.ts`.
- `omniscan-ui/src/components/PhotoPantryUploadModal.vue` — **UPDATE**: integrate the AI analysis call into the upload flow.

---

## Glossary

- **Bug_Condition (C)**: The condition under which the feature is expected to work but currently does not — namely, a user tapping "Continue" after selecting a photo in the pantry upload flow. Without the fix, the app skips AI analysis entirely.
- **Property (P)**: The desired behavior when the bug condition holds — the photo is analyzed, the form is pre-filled (or graceful degradation fires on error), and non-food items are blocked.
- **Preservation**: All code paths outside the new feature must remain unchanged: the `/api/scan` endpoint, the `POST /api/pantry_item` submission, and all non-analyze routes.
- **`OLLAMA_ENDPOINT`**: Exported from `nitro-app/server/lib/ollama-models.ts`; the base URL for all Ollama API calls. Imported, not copied.
- **`SCAN_VISION_MODEL`**: Exported from `nitro-app/server/lib/ollama-models.ts`; resolves to `gemma4:cloud`. Imported, not copied.
- **`stripCodeFences`**: Exported from `nitro-app/server/lib/ai-json.ts`; strips markdown code fences from model output before `JSON.parse`. Imported, not copied.
- **`requireAuth`**: Exported from `nitro-app/server/utils/requireAuth.ts`; throws 401 if no valid session. Imported, not copied.
- **`normalizeToDateStringOrNull`**: Currently inlined in `scan/index.post.ts`. Will be extracted to `lib/date-parse.ts` and exported. Accepts `unknown`, returns `YYYY-MM-DD` string or `null`.
- **`UploadAiExtraction`**: New interface for the analyze endpoint's response: `{ is_food_product: boolean; product_name: string; expiration_date: string | null; ingredients_text: string }`.
- **`apiFetch`**: The project's typed fetch wrapper in `omniscan-ui/src/utils/api.ts`. Always sets `Content-Type: application/json` and `JSON.stringify(body)`, making it **incompatible with `FormData`**. The analyze call must use the browser's native `fetch()` with a manual `Authorization: Bearer <token>` header — the same pattern used in `ScanPage.vue`.
- **`TOKEN_KEY`**: The localStorage key `'omniscan_token'` used to retrieve the auth bearer token for raw `fetch()` calls.
- **`API_BASE_URL`**: Exported from `omniscan-ui/src/utils/api.ts`; empty string in local dev (Vite proxy), set to the backend Vercel URL in production.
- **`selectedFile`**: New `ref<File | null>(null)` in `PhotoPantryUploadModal.vue` that holds the `File` object from the `<input>` change event, required to build `FormData` in `goToStep2()`.

---

## Bug Details

### Bug Condition

The bug manifests when a user selects a photo and taps "Continue" in the `PhotoPantryUploadModal`. The current `goToStep2()` function is a synchronous no-op that simply sets `step.value = 2` without invoking any AI analysis. This means:
- No image is ever sent to the backend for analysis.
- Step 2 is always blank regardless of what the photo shows.
- Non-food photos are never gated.

Additionally, the date-parsing helpers (`MONTH_NAMES`, `isValidYMD`, `tryParseRawDateString`, `normalizeToDateStringOrNull`) are inlined in `scan/index.post.ts` and not exported, so the new endpoint cannot reuse them without introducing duplication. This is a structural issue that the fix resolves by extracting them to a shared lib.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { photo: File, userIsAuthenticated: boolean, remainingUploads: number }
  OUTPUT: boolean

  RETURN input.photo IS NOT NULL
         AND input.userIsAuthenticated = true
         AND input.remainingUploads > 0
         AND goToStep2() DID NOT call /api/pantry_item/analyze
END FUNCTION
```

### Examples

- **Food product photo selected → Continue**: Expected: AI analyzes image, pre-fills product name + expiration date + ingredients text, advances to step 2. Actual (unfixed): jumps to blank step 2 immediately.
- **Non-food photo selected → Continue**: Expected: AI detects non-food, `nonFoodDetected = true`, alert banner shown, step does NOT advance. Actual (unfixed): jumps to step 2 with blank form.
- **Image upload with missing/malformed expiration on label**: Expected: `expiration_date` returns `null` (graceful). Actual (unfixed): N/A — endpoint doesn't exist yet.
- **Ollama unreachable → Continue**: Expected: graceful degradation — advance to blank step 2 (req 2.5). Actual (unfixed): already silently degrades (for the wrong reason — no call is made at all).

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `POST /api/scan` (the scanner flow) must continue to work exactly as before — including all allergen matching, halal logo detection, catalog matching, and verdict logic.
- `POST /api/pantry_item` (pantry item creation) must continue to accept and process requests exactly as before. `ingredients_text` must NOT appear in its POST body.
- The date-parsing utilities (`MONTH_NAMES`, `isValidYMD`, `tryParseRawDateString`, `normalizeToDateStringOrNull`) in `scan/index.post.ts` must behave identically after being extracted to `lib/date-parse.ts` — only the location changes, not the logic.
- All other existing functionality in `PhotoPantryUploadModal.vue` (file validation, daily limit check, form submission, reset, back navigation, storage location, quantity/unit, best-before date) must be unaffected.

**Scope:**
All inputs that do NOT involve the pantry upload photo analysis path are completely unaffected. This includes:
- The main scanner flow (`ScanPage.vue` + `POST /api/scan`)
- Any other Nitro route not under `pantry_item/`
- `handleSubmit()` in `PhotoPantryUploadModal.vue` — no new fields added to its POST body
- Mouse clicks, non-image uploads, and any modal interaction that doesn't reach `goToStep2()`

---

## Hypothesized Root Cause

This is a **missing feature**, not a regression. The root causes of the current gap are:

1. **`goToStep2()` is synchronous and fire-and-forget**: It performs no network call. The fix converts it to `async` and inserts the `fetch → parse → pre-fill` sequence.

2. **No `analyze.post.ts` endpoint exists**: The route `/api/pantry_item/analyze` returns 404. The fix creates the file at `nitro-app/server/api/pantry_item/analyze.post.ts` which Nitro will auto-route via file-based routing.

3. **Date helpers are not exported**: `normalizeToDateStringOrNull` (and its dependencies) are inlined in `scan/index.post.ts` with no `export`. The fix extracts them to `lib/date-parse.ts` so `analyze.post.ts` can import them without duplication.

4. **`selectedFile` ref is absent**: `onFileSelected()` creates an object URL for preview but discards the `File` object. `goToStep2()` needs the raw `File` to build a `FormData`. The fix adds `selectedFile = ref<File | null>(null)` and assigns it in `onFileSelected()`.

5. **`apiFetch` is incompatible with `FormData`**: `apiFetch` unconditionally sets `Content-Type: application/json` and `JSON.stringify(body)`, which destroys a `FormData` payload. The fix bypasses `apiFetch` and uses raw `fetch()` with a manually set `Authorization: Bearer` header — the same pattern already used in `ScanPage.vue`.

---

## Correctness Properties

Property 1: Bug Condition — Analyze Endpoint Returns Correct Extraction

_For any_ authenticated POST request to `/api/pantry_item/analyze` where the multipart body contains a valid image field, the fixed endpoint SHALL call the Gemma4:cloud model via `OLLAMA_ENDPOINT`, parse the response, and return HTTP 200 with a well-formed `UploadAiExtraction` JSON object (`is_food_product`, `product_name`, `expiration_date` normalized to `YYYY-MM-DD` or `null`, `ingredients_text`).

**Validates: Requirements 1.3, 1.4, 1.5**

Property 2: Bug Condition — Frontend Pre-fills Form on Food Product

_For any_ `goToStep2()` call where the analyze API returns `is_food_product === true`, the fixed component SHALL advance to step 2 and pre-fill `form.productName`, `form.expirationDate`, and `form.ingredientsText` from the API response fields (skipping any that are empty/null).

**Validates: Requirements 2.1, 2.3**

Property 3: Bug Condition — Non-Food Detection Blocks Navigation

_For any_ `goToStep2()` call where the analyze API returns `is_food_product === false`, the fixed component SHALL set `nonFoodDetected = true`, remain on step 1, and display the alert banner — it SHALL NOT advance to step 2.

**Validates: Requirements 2.4, 3.1, 3.2**

Property 4: Preservation — Date Parsing Behavior Unchanged

_For any_ date string input to `normalizeToDateStringOrNull` after the refactor (extracted to `lib/date-parse.ts`), the function SHALL return the same value as the original inlined version in `scan/index.post.ts`, preserving all format normalization and validation logic.

**Validates: Requirements implied by scan/index.post.ts preservation**

Property 5: Preservation — handleSubmit Does Not Include ingredientsText

_For any_ pantry item form submission via `handleSubmit()`, the POST body sent to `/api/pantry_item` SHALL NOT include an `ingredients_text` or `ingredientsText` field, preserving the existing API contract.

**Validates: Requirements 4.3**

---

## Fix Implementation

### File 1 — NEW: `nitro-app/server/lib/date-parse.ts`

Extract the four date-parsing symbols from `scan/index.post.ts` verbatim and export them:

```typescript
export const MONTH_NAMES: Record<string, number> = { /* unchanged */ }
export function isValidYMD(y: number, m: number, d: number): string | null { /* unchanged */ }
export function tryParseRawDateString(raw: string): string | null { /* unchanged */ }
export function normalizeToDateStringOrNull(value: unknown): string | null { /* unchanged */ }
```

No logic changes — pure extraction. The `console.warn` in `normalizeToDateStringOrNull` should be updated to tag `[analyze]` when called from the new endpoint but since the function is shared, keep the existing `[scan]` tag or change to a generic `[date-parse]` tag.

### File 2 — NEW: `nitro-app/server/api/pantry_item/analyze.post.ts`

**Imports:**
- `defineEventHandler`, `readMultipartFormData`, `createError` from `h3`
- `requireAuth` from `../../utils/requireAuth`
- `OLLAMA_ENDPOINT`, `SCAN_VISION_MODEL` from `../../lib/ollama-models`
- `stripCodeFences` from `../../lib/ai-json`
- `normalizeToDateStringOrNull` from `../../lib/date-parse`

**Interface:**
```typescript
interface UploadAiExtraction {
  is_food_product: boolean
  product_name: string
  expiration_date: string | null
  ingredients_text: string
}
```

**Inline (not exported from scan):**
- `OllamaChatMessage`, `OllamaChatRequestBody`, `OllamaChatResponse` interfaces — define inline since they are not exported from `scan/index.post.ts`. These are structural types for the Ollama API shape; duplication is acceptable here.

**Prompt (`buildAnalyzePrompt()`):**
A focused subset of the full scan prompt — only requests the four fields needed:
```
You are a food-label analysis assistant. Determine whether the attached photo shows a FOOD OR
BEVERAGE product intended for human consumption. Respond with ONLY a single JSON object matching
this shape exactly:
{"is_food_product": boolean, "product_name": string, "expiration_date": string | null,
"ingredients_text": string}.
When is_food_product is false, set all string fields to "" and expiration_date to null.
When is_food_product is true: product_name is the product name as printed on the label;
expiration_date is any printed expiry/best-before/use-by date converted to YYYY-MM-DD, or null
if absent or unreadable; ingredients_text is the raw ingredient list as printed on the label.
```

**Handler logic (sequential):**
1. `requireAuth(event)` — throws 401 if unauthenticated.
2. `readMultipartFormData(event)` — throws 400 if no form data.
3. Find `image` field — throws 400 if absent.
4. Convert image buffer to base64.
5. Call Ollama via `$fetch<OllamaChatResponse>(OLLAMA_ENDPOINT, { ... })` — throws 502 on network error.
6. Extract `rawContent` from response — throws 502 if empty.
7. `JSON.parse(stripCodeFences(rawContent))` — throws 502 on parse failure.
8. Coerce to `UploadAiExtraction` (normalize booleans, strings, `normalizeToDateStringOrNull`).
9. If `!extraction.is_food_product`: return `{ is_food_product: false, product_name: "", expiration_date: null, ingredients_text: "" }` with HTTP 200 — **do not throw**.
10. Return `extraction` with HTTP 200.

**Error codes:**
| Condition | Status |
|-----------|--------|
| No auth | 401 (via `requireAuth`) |
| No form data or no `image` field | 400 |
| Ollama network failure | 502 |
| Empty Ollama response | 502 |
| JSON parse failure | 502 |
| Non-food result | 200 (not an error) |
| Food result | 200 |

### File 3 — UPDATE: `nitro-app/server/api/scan/index.post.ts`

**Changes Required:**
1. Add import: `import { MONTH_NAMES, isValidYMD, tryParseRawDateString, normalizeToDateStringOrNull } from '../../lib/date-parse'`
2. Remove the four inlined declarations (`MONTH_NAMES`, `isValidYMD`, `tryParseRawDateString`, `normalizeToDateStringOrNull`).
3. No other changes — all call sites remain identical.

### File 4 — UPDATE: `omniscan-ui/src/components/PhotoPantryUploadModal.vue`

**New imports:**
```typescript
import { API_BASE_URL } from '@/utils/api'
```
(Remove `apiFetch` import if it becomes unused after the change — it's still used in `checkDailyUploadLimit` and `handleSubmit`, so keep it.)

**New constant (script scope):**
```typescript
const TOKEN_KEY = 'omniscan_token'
```

**New interface (script scope):**
```typescript
interface AnalyzeResult {
  is_food_product: boolean
  product_name: string
  expiration_date: string | null
  ingredients_text: string
}
```

**New refs:**
```typescript
const selectedFile = ref<File | null>(null)
const isAnalyzing = ref(false)
const nonFoodDetected = ref(false)
```

**New reactive field on `form`:**
```typescript
ingredientsText: '',   // display-only on step 2; never sent to /api/pantry_item
```

**`onFileSelected()` changes:**
- Store the `File` in `selectedFile.value = file` (before or after creating the preview URL).
- Reset state: `nonFoodDetected.value = false` at the top of the handler (requirement 3.3).

**`goToStep2()` — full replacement (async):**
```typescript
async function goToStep2(): Promise<void> {
  if (!previewUrl.value || remainingUploads.value <= 0) return
  nonFoodDetected.value = false
  isAnalyzing.value = true
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const fd = new FormData()
    fd.append('image', selectedFile.value!)
    const response = await fetch(`${API_BASE_URL}/api/pantry_item/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    if (!response.ok) {
      // Graceful degradation: proceed to step 2 blank (req 2.5)
      step.value = 2
      return
    }
    const result: AnalyzeResult = await response.json()
    if (!result.is_food_product) {
      nonFoodDetected.value = true
      return
    }
    if (result.product_name) form.productName = result.product_name
    if (result.expiration_date) form.expirationDate = result.expiration_date
    form.ingredientsText = result.ingredients_text || ''
    step.value = 2
  } catch {
    // Network failure → graceful degradation (req 2.5)
    step.value = 2
  } finally {
    isAnalyzing.value = false
  }
}
```

**`resetAll()` additions:**
```typescript
isAnalyzing.value = false
nonFoodDetected.value = false
selectedFile.value = null
form.ingredientsText = ''
```

**`handleSubmit()` — no change to the body sent to `/api/pantry_item`**: `ingredientsText` is not included (requirement 4.3). The `form.ingredientsText` field exists only for display.

**Template changes — Step 1:**
```html
<!-- Non-food alert banner (req 3.1) -->
<div v-if="nonFoodDetected" class="nonfood-alert">
  Non-food product detected. Only edible food items can be added to your pantry.
</div>

<!-- Continue button (reqs 2.2, 3.2, 3.4) -->
<ion-button
  expand="block"
  class="primary-button"
  :disabled="!previewUrl || remainingUploads <= 0 || isAnalyzing || nonFoodDetected"
  @click="goToStep2">
  <ion-spinner v-if="isAnalyzing" name="crescent" slot="start" />
  {{ isAnalyzing ? 'Analyzing…' : 'Continue' }}
</ion-button>
```

**Template changes — Step 2:**
```html
<!-- Ingredients text display (reqs 4.1, 4.2) -->
<div v-if="form.ingredientsText" class="ingredients-display">
  <label class="field-label-brown">Detected Ingredients</label>
  <p class="ingredients-text-readonly">{{ form.ingredientsText }}</p>
</div>
```

**New CSS classes:**
```css
.nonfood-alert {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.825rem;
  font-weight: 500;
  margin: 10px 0;
}

.ingredients-display {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 14px;
  margin: 12px 0;
}

.ingredients-text-readonly {
  font-size: 0.825rem;
  color: #374151;
  line-height: 1.5;
  margin: 4px 0 0;
  white-space: pre-wrap;
}
```

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, verify that the new endpoint and updated component exhibit the correct behavior for all bug-condition inputs; then verify that existing behavior is preserved for all non-bug inputs. Property-based tests are the preferred tool for preservation checking because they generate wide input coverage automatically.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the gap BEFORE implementing the fix. Confirm that `goToStep2()` on the unfixed component does not call the analyze endpoint, and that the analyze endpoint route doesn't exist.

**Test Plan**: Mount `PhotoPantryUploadModal.vue` in a test environment, mock a file selection, call `goToStep2()`, and assert that no network request was made to `/api/pantry_item/analyze`. Run these tests on the UNFIXED code to confirm the absence of the call.

**Test Cases:**
1. **Endpoint 404 Test**: `curl -X POST /api/pantry_item/analyze` returns 404 before the file is created (will confirm on unfixed code).
2. **goToStep2 No-Fetch Test**: Trigger `goToStep2()` on the unfixed component and assert `fetch` was never called (will confirm on unfixed code).
3. **Non-Food Not Blocked Test**: Select a photo, call `goToStep2()` on unfixed component, assert `step.value === 2` regardless of image content (confirms bug on unfixed code).
4. **Date Helpers Unavailable Test**: Attempt to import `normalizeToDateStringOrNull` from `scan/index.post.ts` — expect undefined/error, confirming extraction is needed.

**Expected Counterexamples:**
- `goToStep2()` returns immediately without any async activity.
- `nonFoodDetected` is never set to `true` regardless of image content.
- Possible causes: function is synchronous, no fetch call is present, no endpoint exists.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (valid authenticated image upload), the fixed endpoint and component produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := analyzeEndpoint_fixed(input)
  ASSERT result.status IN [200, 400, 401, 502]
  IF result.status = 200 THEN
    ASSERT result.body HAS is_food_product (boolean)
    ASSERT result.body HAS product_name (string)
    ASSERT result.body HAS expiration_date (YYYY-MM-DD string OR null)
    ASSERT result.body HAS ingredients_text (string)
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (existing scan flow, existing form submission, non-analyze routes), the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT scanEndpoint_original(input) = scanEndpoint_fixed(input)
  ASSERT handleSubmit_original(input) = handleSubmit_fixed(input)
  ASSERT normalizeToDateStringOrNull_original(dateStr) = normalizeToDateStringOrNull_extracted(dateStr)
END FOR
```

**Testing Approach**: Property-based testing is well-suited for the date-parse extraction because:
- `normalizeToDateStringOrNull` has a rich input space (many date formats, edge cases).
- PBT can generate hundreds of random date strings and assert the extracted function returns the same value as the original.
- It catches subtle copy-paste bugs in the extraction (e.g., an off-by-one in `isValidYMD`).

**Test Cases:**
1. **Date Parse Round-Trip Preservation**: Generate random date strings across all supported formats; assert `normalizeToDateStringOrNull` (extracted) === `normalizeToDateStringOrNull` (original) for every input.
2. **Scan Endpoint Preservation**: Send a known scan request before and after the `scan/index.post.ts` refactor; assert response is identical.
3. **handleSubmit Body Preservation**: Submit the pantry form after the modal update; assert the POST body sent to `/api/pantry_item` contains no `ingredientsText` or `ingredients_text` field.
4. **Non-Analyzing State Preservation**: When `previewUrl` is null or `remainingUploads <= 0`, `goToStep2()` must still return early without any side effects.

### Unit Tests

- **analyze.post.ts — 400 on missing image**: POST with no multipart data or no `image` field returns 400.
- **analyze.post.ts — 401 on missing token**: POST without a valid session returns 401.
- **analyze.post.ts — 502 on Ollama failure**: Mock `$fetch` to throw a network error; assert 502.
- **analyze.post.ts — 502 on empty response**: Mock Ollama response with empty `message.content`; assert 502.
- **analyze.post.ts — 502 on invalid JSON**: Mock Ollama response with non-JSON content; assert 502.
- **analyze.post.ts — 200 on non-food**: Mock Ollama returning `{ is_food_product: false, ... }`; assert HTTP 200 with `{ is_food_product: false, product_name: "", expiration_date: null, ingredients_text: "" }`.
- **analyze.post.ts — expiration_date normalization**: Mock various date formats from Ollama; assert `expiration_date` is always `YYYY-MM-DD` or `null`.
- **PhotoPantryUploadModal — isAnalyzing state**: `isAnalyzing` is `true` during the fetch, `false` after resolve or reject.
- **PhotoPantryUploadModal — nonFoodDetected clears on new file**: Select a photo, trigger non-food result, select a new photo, assert `nonFoodDetected === false`.
- **PhotoPantryUploadModal — graceful degradation**: Mock fetch to throw; assert `step.value === 2` and form fields are blank.
- **date-parse.ts — isValidYMD rejects Feb 30**: `isValidYMD(2024, 2, 30)` returns `null`.
- **date-parse.ts — tryParseRawDateString handles all documented formats**: `"31 DEC 2026"`, `"12/31/2026"`, `"2026.12.31"`, `"12/2026"`, `"12/26"`.

### Property-Based Tests

- **`normalizeToDateStringOrNull` extraction equivalence**: For any string generated by concatenating random digits, slashes, hyphens, dots, and month abbreviations, the extracted version returns the same value as the original — verifies the refactor introduced no behavioral change.
- **`analyze` response always has correct shape**: For any mocked Ollama response, the coerced `UploadAiExtraction` always satisfies: `is_food_product` is boolean, `product_name` is string, `expiration_date` is `YYYY-MM-DD` string or `null`, `ingredients_text` is string.
- **Button disabled state is correct for all state combinations**: For any combination of `(previewUrl: boolean, remainingUploads: number, isAnalyzing: boolean, nonFoodDetected: boolean)`, the "Continue" button's disabled state equals `!previewUrl || remainingUploads <= 0 || isAnalyzing || nonFoodDetected`.
- **handleSubmit body never contains ingredientsText**: For any `form` state including any `ingredientsText` value, the body passed to `apiFetch('/api/pantry_item', ...)` never contains a key named `ingredientsText` or `ingredients_text`.

### Integration Tests

- **Full happy path**: Select a food photo → tap Continue → mock Ollama returns food extraction → step 2 shown with pre-filled fields → submit → pantry item created.
- **Non-food full path**: Select a non-food photo → tap Continue → mock Ollama returns non-food → alert shown, step 1 retained → select a new photo → `nonFoodDetected` clears → can continue.
- **Graceful degradation full path**: Select a photo → tap Continue → mock Ollama unreachable (502) → step 2 shown with blank form → user fills manually → submit succeeds.
- **Scan endpoint unchanged after refactor**: Run the existing scan integration test suite after extracting date helpers; all tests must pass without modification.
