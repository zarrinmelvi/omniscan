# Simplified Ingredients with Allergen Highlighting — Bugfix Design

## Overview

This document describes the design for fixing five related defects that together prevent the Ingredients tab from delivering meaningful, allergen-aware ingredient information to users.

The core problem is a broken pipeline: the scan AI prompt instructs the AI vaguely so it produces unhelpful simplifications; the upload AI flow never requests a simplification at all; the upload creation endpoint discards any simplification even if one were forwarded; the frontend modal loses the simplification before the POST; and the Ingredients tab presents a flat, undifferentiated text block with no visual allergen highlighting.

The fix is applied across five files — `scan/index.post.ts`, `analyze.post.ts`, `pantry_item/index.post.ts`, `PhotoPantryUploadModal.vue`, and `PantryItemDetail.vue` — to close every gap in the pipeline and redesign the Ingredients tab UI.

## Glossary

- **Bug_Condition (C)**: A compound condition that is true when ANY of the five defects above applies to a given execution path — vague prompt instruction used, upload flow called without `simplified_ingredients` in the AI shape, upload creation called without `simplified_ingredients` forwarded, modal submitting without including the simplification, or Ingredients tab rendered without plain-English + allergen-highlight display.
- **Property (P)**: The desired correct behavior for each defect — the AI receives enriched instructions, `simplified_ingredients` is wired through the entire pipeline, and the Ingredients tab renders two distinct sections with allergen highlighting.
- **Preservation**: All existing extraction logic, fallback behaviors, navigation, and non-ingredient tab rendering that must remain unchanged by this fix.
- **buildPrompt()**: The function in `server/api/scan/index.post.ts` that constructs the AI OCR prompt used for barcode-scan flow product analysis.
- **buildAnalyzePrompt()**: The function in `server/api/pantry_item/analyze.post.ts` that constructs the AI prompt for upload-flow photo analysis.
- **UploadAiExtraction**: The TypeScript interface in `analyze.post.ts` that models the JSON the AI returns for uploaded photos.
- **coerceUploadExtraction()**: The function in `analyze.post.ts` that validates and normalizes the raw AI JSON into a typed `UploadAiExtraction` object.
- **CreatePantryItemBody**: The TypeScript interface in `pantry_item/index.post.ts` that models the POST body sent when creating a new pantry item.
- **AnalyzeResult**: The TypeScript interface in `PhotoPantryUploadModal.vue` that models the response from `analyze.post.ts`.
- **highlightedSimplifiedIngredients**: The computed property in `PantryItemDetail.vue` that escapes HTML and wraps allergen-matching terms in highlight spans.
- **isBugCondition(input)**: Pseudocode function used throughout this document to identify inputs that trigger any of the five defects.

## Bug Details

### Bug Condition

The bug manifests across five distinct code sites in the feature's pipeline. Each site has its own specific condition:

- **Site 1** (`scan/index.post.ts`): any call to `buildPrompt()` returns the old vague instruction.
- **Site 2** (`analyze.post.ts`): any upload-flow AI call where `simplified_ingredients` is absent from the prompt JSON shape, the `UploadAiExtraction` interface, or `coerceUploadExtraction`.
- **Site 3** (`pantry_item/index.post.ts`): any `CreatePantryItemBody` POST where `simplified_ingredients` is present in the request body but is not destructured or used in the product `create` call.
- **Site 4** (`PhotoPantryUploadModal.vue`): any call to `goToStep2()` where `result.simplified_ingredients` is not stored, or any `handleSubmit()` call where `simplified_ingredients` is not in the POST body.
- **Site 5** (`PantryItemDetail.vue`): any render of the Ingredients tab where the template is the single flat text block with no plain-English section, no raw list accordion, and no allergen highlighting.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input — one of: { site: 'scan_prompt' }
                        | { site: 'upload_extraction', field: string }
                        | { site: 'pantry_create', body: CreatePantryItemBody }
                        | { site: 'modal_submit', form: FormState }
                        | { site: 'ingredients_tab', item: PantryItemDetailDto }
  OUTPUT: boolean

  IF input.site = 'scan_prompt'
    RETURN buildPrompt() does NOT include enriched chemical-name explanation instructions
  END IF

  IF input.site = 'upload_extraction'
    RETURN 'simplified_ingredients' NOT IN UploadAiExtraction interface
        OR 'simplified_ingredients' NOT IN AI prompt JSON shape
        OR 'simplified_ingredients' NOT IN coerceUploadExtraction return
  END IF

  IF input.site = 'pantry_create'
    RETURN 'simplified_ingredients' NOT IN CreatePantryItemBody
        OR product.create uses ingredient_text instead of simplified_ingredients
  END IF

  IF input.site = 'modal_submit'
    RETURN 'simplified_ingredients' NOT IN AnalyzeResult interface
        OR form.simplifiedIngredientsText is NOT populated from result
        OR 'simplified_ingredients' NOT IN POST body
  END IF

  IF input.site = 'ingredients_tab'
    RETURN template uses single flat text block
        OR allergen terms are NOT highlighted in simplified text
  END IF

  RETURN false
END FUNCTION
```

### Examples

- **Scan prompt vagueness**: AI receives "restate that list in plain, easy-to-understand language" → returns "Water, Modified Starch, Carrageenan, Sodium Ascorbate" (identical to raw list, no explanation)
- **Upload extraction gap**: User uploads a packet of instant noodles; `analyze.post.ts` returns `{ ingredients_text: "Wheat flour, Carrageenan, Albumin...", ...}` with no `simplified_ingredients` key → detail view shows raw list
- **Pantry create discard**: Modal calls `POST /api/pantry_item` with `simplified_ingredients: "Wheat flour, Carrageenan (seaweed thickener), Albumin (egg-derived)..."` → server ignores the field, stores `ingredient_text` value in `simplified_ingredients` column
- **Modal submit gap**: `goToStep2()` populates `form.ingredientsText` but not `form.simplifiedIngredientsText` → POST body never includes `simplified_ingredients`
- **Flat tab, no highlight**: User with a milk allergy opens Ingredients tab; text shows "Casein, Whey, Lactose" with no visual distinction → user cannot quickly spot which terms match their allergens

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The scan endpoint must continue extracting all existing fields (`is_food_product`, `product_name`, `brand`, `ingredients_text`, `halal_logo_detected`, `certifying_body`, `expiration_date`, `net_quantity`, `net_unit`) with unchanged coercion rules.
- The scan endpoint's catalog fallback (populating `ingredient_text` and `simplified_ingredients` from a catalog match when AI returns empty text) must continue unchanged.
- The upload analyze endpoint must continue returning `is_food_product: false` with empty string fields and null dates/quantities for non-food images.
- The `pantry_item/index.post.ts` barcode-scan path (when `product_id` is provided) must continue looking up the existing product without creating a new one, unaffected by the new field.
- The modal's allergen guardrail (`matchedUserAllergens` confirmation alert) must continue to fire before form submission.
- The Overview and Alternatives tabs in `PantryItemDetail.vue` must continue rendering exactly as before.
- The "No ingredient information available for this item." fallback must continue to display when both `ingredient_text` and `simplified_ingredients` are absent.

**Scope:**
All execution paths that do NOT involve the five bug-condition sites above should be completely unaffected. This includes:
- Mouse/touch interaction with any tab other than Ingredients
- The scan flow's product matching, halal logo detection, and allergen matching logic
- The upload flow's allergen matching, daily upload limit check, and form validation
- Any product in the pantry that was added via barcode scan (uses `product_id` path)

## Hypothesized Root Cause

1. **Incomplete AI Prompt Specification (Site 1 & 2)**: The original `simplified_ingredients` instruction in both prompts uses vague natural-language guidance without specifying output format, without naming chemical-explanation examples, and without identifying hidden allergen derivatives. The AI produces output that mirrors the format and vocabulary of the raw ingredient list because no concrete examples or format constraints were provided. Fix: replace both instructions with specific numbered rules and concrete examples.

2. **Missing Field in Upload AI Contract (Site 2)**: The `UploadAiExtraction` interface, the JSON shape string in `buildAnalyzePrompt()`, and `coerceUploadExtraction()` were written before `simplified_ingredients` was identified as a required output, so the field was simply never added. The AI silently produces the field when prompted but it is stripped before it reaches the caller. Fix: add the field to all three locations.

3. **API Contract Gap Between Modal and Backend (Sites 3 & 4)**: The `CreatePantryItemBody` interface and the product `create` call in `pantry_item/index.post.ts` were written without `simplified_ingredients` in scope. The `PhotoPantryUploadModal.vue` form state and submit payload were also designed before the upload flow was expected to produce a simplification. Fix: add the field to both interface and destructuring in the backend, and add the field to `AnalyzeResult`, `form`, `resetAll`, `goToStep2`, and the submit body in the frontend.

4. **UI Design Not Updated for Feature (Site 5)**: The Ingredients tab template in `PantryItemDetail.vue` was originally designed to show a single text block and was never updated to reflect the intent of the `simplified_ingredients` column. The `matched_user_allergens` array was loaded but never used for inline highlighting. Fix: replace the template with a two-section design (plain-English card + collapsible raw list accordion) and add `highlightedSimplifiedIngredients` computed property with HTML escaping and allergen span injection.

## Correctness Properties

Property 1: Bug Condition — Enriched Simplification Pipeline

_For any_ execution path where the bug condition holds (isBugCondition returns true for any of the five sites), the fixed code SHALL produce a `simplified_ingredients` value that: (a) explains chemical/technical ingredient names in parentheses, (b) names hidden allergen derivative sources, (c) is correctly carried through the entire pipeline from AI response → analyze endpoint → modal form → pantry create POST → database → detail view, and (d) is rendered in the Ingredients tab as a clearly labelled "Plain English Breakdown" section with allergen-matching terms highlighted as inline bold red chips.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation — Existing Pipeline and UI Behavior

_For any_ execution path where the bug condition does NOT hold (isBugCondition returns false — i.e., barcode scan flow, non-ingredient tab rendering, non-food upload detection, form validation, allergen guardrail, daily limit check), the fixed code SHALL produce exactly the same result as the original code, preserving all existing extraction logic, validation rules, UI flows, and fallback behaviors.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

**Fix 1 — File:** `server/api/scan/index.post.ts`  
**Function:** `buildPrompt()`

**Specific Changes:**
1. **Replace vague prompt instruction**: Remove the two-line vague instruction and replace with four numbered rules specifying: (1) explain technical/chemical names in parentheses with concrete examples, (2) identify hidden allergen derivatives naming their source with concrete examples, (3) keep everyday names as-is, (4) output should be readable to someone wanting to know what they are eating.

---

**Fix 2 — File:** `server/api/pantry_item/analyze.post.ts`  
**Interface:** `UploadAiExtraction`  
**Function:** `buildAnalyzePrompt()`, `coerceUploadExtraction()`

**Specific Changes:**
1. **Extend interface**: Add `simplified_ingredients: string` to `UploadAiExtraction`.
2. **Update JSON shape string**: Add `"simplified_ingredients": string` to the JSON shape in `buildAnalyzePrompt()`, placed after `"ingredients_text"`.
3. **Add prompt instruction**: Insert the enriched `simplified_ingredients` instruction (same rules as Fix 1, condensed to single line) after the `ingredients_text` instruction in the prompt array.
4. **Extend coercion**: Add `simplified_ingredients: typeof c.simplified_ingredients === 'string' ? c.simplified_ingredients : ''` to the return object in `coerceUploadExtraction()`.
5. **Return included via spread**: The existing `return { ...extraction, matched_user_allergens: allMatchedNames }` spread already propagates the new field — no change needed to the return statement.

---

**Fix 3 — File:** `server/api/pantry_item/index.post.ts`  
**Interface:** `CreatePantryItemBody`  
**Handler:** `defineEventHandler`

**Specific Changes:**
1. **Extend interface**: Add `simplified_ingredients?: string` to `CreatePantryItemBody`.
2. **Destructure new field**: Add `simplified_ingredients` to the destructuring assignment from `body`.
3. **Use in product create**: Change `simplified_ingredients: ingredient_text?.trim() || 'Unknown'` to `simplified_ingredients: simplified_ingredients?.trim() || ingredient_text?.trim() || 'Unknown'` so the AI-generated value takes precedence over the raw OCR text.

---

**Fix 4 — File:** `omniscan-ui/src/components/PhotoPantryUploadModal.vue`  
**Interface:** `AnalyzeResult`  
**Refs/Reactive:** `form`, `resetAll()`, `goToStep2()`, `handleSubmit()`

**Specific Changes:**
1. **Extend interface**: Add `simplified_ingredients: string` to `AnalyzeResult`.
2. **Add form field**: Add `simplifiedIngredientsText: ''` to the `form` reactive object.
3. **Reset field**: Add `form.simplifiedIngredientsText = ''` to `resetAll()`.
4. **Populate from AI result**: In `goToStep2()`, after `form.ingredientsText = result.ingredients_text || ''`, add `form.simplifiedIngredientsText = result.simplified_ingredients || ''`.
5. **Include in POST**: In `handleSubmit()`'s POST body, add `simplified_ingredients: form.simplifiedIngredientsText || undefined`.

---

**Fix 5 — File:** `omniscan-ui/src/views/PantryItemDetail.vue`  
**Template:** Ingredients tab block  
**Script:** `<script setup>`  
**Style:** `<style scoped>` and `dark-mode.css`

**Specific Changes:**
1. **Import icons**: Import `chevronUpOutline` and `chevronDownOutline` from `ionicons/icons`.
2. **Add accordion state**: Add `const rawIngredientsOpen = ref(false)`.
3. **Add `hasSimplifiedIngredients` computed**: Returns true when `simplified_ingredients` is a non-empty string that is not `'Unknown'` (case-insensitive).
4. **Add `highlightedSimplifiedIngredients` computed**: Escapes the simplification text as HTML, then iterates `item.value.matched_user_allergens` and wraps each matching term (case-insensitive regex) in `<span class="ingredient-allergen-highlight">`.
5. **Add `escapeHtml` helper function**: Escapes `&`, `<`, `>`, `"`, `'` to prevent XSS when using `v-html`.
6. **Replace Ingredients template block**: Replace the single info-card with two cards — "Plain English Breakdown" (always visible, uses `v-html` on `highlightedSimplifiedIngredients`) and "Full Ingredient List" (collapsible accordion, shows `ingredient_text`).
7. **Add scoped CSS**: Add styles for `.ingredient-allergen-highlight`, `.ingredients-accordion-header`, `.accordion-chevron`, `.ingredients-accordion-body`, `.ingredients-text--muted`.
8. **Add dark-mode CSS**: Add `html.ion-palette-dark .ingredient-allergen-highlight` rule to `dark-mode.css`.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each defect on unfixed code (exploratory checking), then verify the fix works correctly for all buggy inputs (fix checking) and that existing behavior is unchanged for all non-buggy inputs (preservation checking).

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each of the five defects BEFORE implementing the fixes. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that call `buildPrompt()` directly and inspect the returned string; call `buildAnalyzePrompt()` and `coerceUploadExtraction()` with mock AI responses; call the pantry create handler with a body that includes `simplified_ingredients`; mount `PhotoPantryUploadModal.vue` and simulate the `goToStep2()` / `handleSubmit()` flow; and mount `PantryItemDetail.vue` with a mock item containing allergen data and inspect the Ingredients tab HTML.

**Test Cases:**
1. **Scan prompt vagueness** (Site 1): Assert that `buildPrompt()` returns a string that does NOT contain "Alpha-tocopherol (Vitamin E)" as an example → will fail on unfixed code because the enriched instruction is absent.
2. **Upload extraction gap** (Site 2): Call `coerceUploadExtraction({ simplified_ingredients: "Water, Sugar" })` → assert the returned object has `simplified_ingredients === "Water, Sugar"` → will fail on unfixed code because the field is not in the return object.
3. **Pantry create discard** (Site 3): Call the handler with `{ simplified_ingredients: "Test simplification", ingredient_text: "Test raw" }` → assert the created product's `simplified_ingredients` is `"Test simplification"` → will fail on unfixed code because the field is ignored.
4. **Modal form gap** (Site 4): Simulate `goToStep2()` with `result.simplified_ingredients = "Casein (milk protein)"` → assert `form.simplifiedIngredientsText === "Casein (milk protein)"` → will fail on unfixed code because the field is not populated.
5. **POST body gap** (Site 4, submit): Spy on the POST call in `handleSubmit()` → assert the POST body includes `simplified_ingredients` → will fail on unfixed code because the field is absent.
6. **Flat tab, no highlight** (Site 5): Mount `PantryItemDetail.vue` with `simplified_ingredients: "Casein (milk protein)"` and `matched_user_allergens: ["milk"]` → assert the rendered HTML contains `<span class="ingredient-allergen-highlight">` → will fail on unfixed code because the template does not use `v-html` or any highlight logic.

**Expected Counterexamples:**
- `buildPrompt()` output does not include "Alpha-tocopherol", "Casein (milk protein)", or numbered rules
- `coerceUploadExtraction` silently drops `simplified_ingredients`
- Product created with raw `ingredient_text` value in `simplified_ingredients` column despite AI simplification being available
- POST body missing `simplified_ingredients` key
- Ingredients tab HTML contains no `ingredient-allergen-highlight` spans

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedCode(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Concrete assertions after fix:**
- `buildPrompt()` output CONTAINS numbered rule "(1) Explain technical/chemical names in parentheses" and example "Alpha-tocopherol (Vitamin E)"
- `buildAnalyzePrompt()` output CONTAINS `"simplified_ingredients": string` in the JSON shape
- `coerceUploadExtraction({ ..., simplified_ingredients: "Casein (milk protein)" })` returns object with `simplified_ingredients === "Casein (milk protein)"`
- Handler with `{ simplified_ingredients: "Test simplification", ingredient_text: "Test raw" }` creates product with `simplified_ingredients === "Test simplification"`
- `form.simplifiedIngredientsText` equals `result.simplified_ingredients` after `goToStep2()`
- POST body contains `simplified_ingredients: form.simplifiedIngredientsText`
- Ingredients tab renders "Plain English Breakdown" heading
- Allergen term wrapped in `<span class="ingredient-allergen-highlight">` when present in `matched_user_allergens`

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalCode(input) = fixedCode(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-ingredient-tab paths and non-simplified-ingredients flows, then write property-based tests capturing that behavior.

**Test Cases:**
1. **Scan extraction preservation**: Generate random valid AI response objects containing `is_food_product: true` and all existing fields → assert `coerceAiExtraction` returns the same values after fix (the new field does not alter existing field coercion)
2. **Upload non-food preservation**: Call upload analyze handler with `is_food_product: false` response → assert returns `{ is_food_product: false, product_name: '', ... }` exactly as before
3. **Pantry create barcode path**: Call handler with `product_id` present → assert no new product is created and `simplified_ingredients` field is not consulted
4. **Modal allergen guardrail**: Simulate `handleSubmit()` with `matchedUserAllergens: ['milk']` → assert alert is shown before submission proceeds
5. **Overview and Alternatives tabs**: Mount `PantryItemDetail.vue` and navigate to 'overview' and 'alternatives' tabs → assert their HTML is byte-for-byte identical before and after fix
6. **No-ingredient fallback**: Mount Ingredients tab with `simplified_ingredients: null` and `ingredient_text: null` → assert "No ingredient information available for this item." appears

### Unit Tests

- Test `buildPrompt()` output string for presence of all four numbered rules and at least three concrete examples
- Test `buildAnalyzePrompt()` JSON shape string for `"simplified_ingredients": string`
- Test `coerceUploadExtraction()` with valid string, empty string, null, and missing `simplified_ingredients` values
- Test `CreatePantryItemBody` handler: `simplified_ingredients` present → product uses it; absent → falls back to `ingredient_text`; both absent → stores 'Unknown'
- Test `escapeHtml()` helper with `&`, `<`, `>`, `"`, `'` characters to prevent XSS via `v-html`
- Test `hasSimplifiedIngredients` computed: false for null, '', 'unknown', 'Unknown'; true for non-empty non-unknown strings
- Test `highlightedSimplifiedIngredients` computed: allergen terms are wrapped; non-allergen terms are not wrapped; HTML special chars in ingredient text are escaped before wrapping

### Property-Based Tests

- Generate random ingredient text strings (including those with HTML special characters) and verify `escapeHtml` always neutralizes `<`, `>`, `&`, `"`, `'` before the string is injected via `v-html`
- Generate random allergen lists and ingredient texts and verify each allergen term that appears in the text receives exactly one `ingredient-allergen-highlight` span, with case-insensitive matching
- Generate random `CreatePantryItemBody` objects with and without `simplified_ingredients` and verify the priority rule (`simplified_ingredients` > `ingredient_text` > 'Unknown') is always respected
- Generate random non-simplified-ingredients POST bodies and verify existing fields in the response are unchanged

### Integration Tests

- Full upload flow: upload an image → AI returns `simplified_ingredients` → modal stores it → POST body includes it → product is created with correct `simplified_ingredients` value → Ingredients tab shows the plain-English breakdown
- Full scan flow: scan a product → AI returns `simplified_ingredients` with enriched explanations → detail view renders the plain-English breakdown with allergen highlights
- Dark mode: toggle `html.ion-palette-dark` class → allergen highlight chips switch to red-on-dark-background styling
- Accordion toggle: click "Full Ingredient List" header → raw ingredient list appears; click again → it collapses
- Allergen highlight: item with `matched_user_allergens: ['casein']` and `simplified_ingredients` containing "Casein (milk protein)" → "Casein" is rendered in bold red chip
