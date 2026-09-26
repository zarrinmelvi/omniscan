# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Simplified Ingredients Pipeline Defects (All 5 Sites)
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate each of the five pipeline defects
  - **Scoped PBT Approach**: Scope each sub-property to the concrete failing case(s) for reproducibility
  - Site 1 — Assert `buildPrompt()` output CONTAINS the enriched numbered-rule instruction with example "Alpha-tocopherol (Vitamin E)"; test will fail because the vague two-line instruction is still present
  - Site 2 — Call `coerceUploadExtraction({ simplified_ingredients: "Casein (milk protein)" })` and assert returned object has `simplified_ingredients === "Casein (milk protein)"`; test will fail because the field is absent from the interface and coercion return
  - Site 3 — Call the pantry create handler with `{ simplified_ingredients: "Test simplification", ingredient_text: "Test raw" }` and assert the product write uses `"Test simplification"` not `"Test raw"`; test will fail because the field is ignored
  - Site 4 — Simulate `goToStep2()` with `result.simplified_ingredients = "Casein (milk protein)"` and assert `form.simplifiedIngredientsText === "Casein (milk protein)"`, then spy on POST body and assert `simplified_ingredients` key is present; test will fail because the field is never populated or sent
  - Site 5 — Mount `PantryItemDetail.vue` with `simplified_ingredients: "Casein (milk protein)"` and `matched_user_allergens: ["milk"]` and assert rendered HTML contains `<span class="ingredient-allergen-highlight">`; test will fail because the template uses a flat text block with no highlight logic
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the five pipeline defects exist)
  - Document counterexamples found to understand root cause (e.g., "buildPrompt() returns vague instruction — no Alpha-tocopherol example found", "coerceUploadExtraction silently drops simplified_ingredients", etc.)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Pipeline and UI Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for all non-bug-condition paths (isBugCondition returns false)
  - Observe: `coerceAiExtraction` returns correct values for all existing fields when `simplified_ingredients` is absent from input
  - Observe: upload analyze handler returns `{ is_food_product: false, product_name: '', ... }` for non-food images
  - Observe: pantry create handler with `product_id` present performs a lookup and never creates a new product
  - Observe: `handleSubmit()` in `PhotoPantryUploadModal.vue` shows allergen alert before submitting when `matchedUserAllergens` is non-empty
  - Observe: Overview and Alternatives tabs in `PantryItemDetail.vue` render their full HTML unaffected when Ingredients tab is not active
  - Observe: Ingredients tab renders "No ingredient information available for this item." when both `ingredient_text` and `simplified_ingredients` are null/absent
  - Write property-based tests capturing the observed behavior patterns from Preservation Requirements in design:
    - For all random valid AI response objects (with all existing fields, no `simplified_ingredients`), `coerceAiExtraction` preserves each existing field exactly
    - For all random `CreatePantryItemBody` inputs that include `product_id`, the handler path does not reference `simplified_ingredients`
    - For all non-ingredient tab renders, the HTML output is identical before and after the fix
    - The fallback message always appears when both ingredient fields are absent
  - Verify all tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 3. Fix simplified ingredients pipeline (all 5 sites)

  - [ ] 3.1 Fix Site 1 — Replace vague scan prompt instruction in `buildPrompt()`
    - In `nitro-app/server/api/scan/index.post.ts`, inside `buildPrompt()`, remove the two-line vague instruction for `simplified_ingredients`
    - Replace with four numbered rules: (1) explain technical/chemical names in parentheses with concrete examples ("Alpha-tocopherol (Vitamin E)", "Sodium ascorbate (Vitamin C)", "Carrageenan (seaweed thickener)", "Tartrazine (Yellow food dye No.5)"); (2) identify hidden allergen derivatives and name their source ("Casein (milk protein)", "Ovalbumin (egg white protein)", "Hydrolyzed wheat protein (gluten source)", "Albumin (egg-derived)", "Lactose (milk sugar)", "Whey (milk-derived)", "Lecithin (may be soy-derived)"); (3) keep everyday names as-is ("water", "sugar", "salt", "palm oil", "onion powder"); (4) output must be readable by someone wanting to know what they are actually eating
    - _Bug_Condition: isBugCondition({ site: 'scan_prompt' }) — buildPrompt() does NOT include enriched chemical-name explanation instructions_
    - _Expected_Behavior: buildPrompt() output contains all four numbered rules and concrete examples per design Fix 1_
    - _Preservation: All other prompt fields and extraction logic in buildPrompt() remain unchanged (Requirements 3.1, 3.2)_
    - _Requirements: 1.1, 2.1, 3.1, 3.2_

  - [ ] 3.2 Fix Site 2 — Wire `simplified_ingredients` through upload extraction in `analyze.post.ts`
    - In `nitro-app/server/api/pantry_item/analyze.post.ts`, add `simplified_ingredients: string` to the `UploadAiExtraction` interface
    - In `buildAnalyzePrompt()`, insert `"simplified_ingredients": string` into the JSON shape string after `"ingredients_text"`
    - In `buildAnalyzePrompt()`, after the `ingredients_text` instruction line, add the condensed enriched instruction for `simplified_ingredients`: explain chemical names in parentheses, name hidden allergen derivatives, keep everyday names as-is, return `""` if `ingredients_text` is empty
    - In `coerceUploadExtraction()`, add `simplified_ingredients: typeof c.simplified_ingredients === 'string' ? c.simplified_ingredients : ''` to the return object
    - The existing `return { ...extraction, matched_user_allergens: allMatchedNames }` spread already propagates the new field — no change needed to the return statement
    - _Bug_Condition: isBugCondition({ site: 'upload_extraction' }) — 'simplified_ingredients' NOT IN UploadAiExtraction, AI prompt shape, or coerceUploadExtraction return_
    - _Expected_Behavior: coerceUploadExtraction returns object with correct simplified_ingredients string value per design Fix 2_
    - _Preservation: All other interface fields, prompt instructions, and coercion rules remain unchanged (Requirements 3.3)_
    - _Requirements: 1.2, 2.2, 3.3_

  - [ ] 3.3 Fix Site 3 — Accept and use `simplified_ingredients` in pantry create endpoint
    - In `nitro-app/server/api/pantry_item/index.post.ts`, add `simplified_ingredients?: string` to the `CreatePantryItemBody` interface
    - Add `simplified_ingredients` to the destructuring assignment from `body`
    - Change `simplified_ingredients: ingredient_text?.trim() || 'Unknown'` to `simplified_ingredients: simplified_ingredients?.trim() || ingredient_text?.trim() || 'Unknown'` so the AI-generated value takes precedence
    - _Bug_Condition: isBugCondition({ site: 'pantry_create' }) — 'simplified_ingredients' NOT IN CreatePantryItemBody, product.create uses ingredient_text instead_
    - _Expected_Behavior: product created with AI-generated simplified_ingredients when provided, falls back to ingredient_text then 'Unknown' per design Fix 3_
    - _Preservation: Barcode scan path (product_id lookup) and all other body fields unchanged (Requirements 3.4)_
    - _Requirements: 1.3, 2.3, 3.4_

  - [ ] 3.4 Fix Site 4 — Forward `simplified_ingredients` through modal form and POST body
    - In `omniscan-ui/src/components/PhotoPantryUploadModal.vue`, add `simplified_ingredients: string` to the `AnalyzeResult` interface
    - Add `simplifiedIngredientsText: ''` to the `form` reactive object
    - Add `form.simplifiedIngredientsText = ''` to `resetAll()`
    - In `goToStep2()`, after `form.ingredientsText = result.ingredients_text || ''`, add `form.simplifiedIngredientsText = result.simplified_ingredients || ''`
    - In `handleSubmit()` POST body, add `simplified_ingredients: form.simplifiedIngredientsText || undefined`
    - _Bug_Condition: isBugCondition({ site: 'modal_submit' }) — 'simplified_ingredients' NOT IN AnalyzeResult, form.simplifiedIngredientsText not populated, not in POST body_
    - _Expected_Behavior: form stores simplified_ingredients from AI result, POST body includes it, value reaches pantry create endpoint per design Fix 4_
    - _Preservation: Allergen guardrail confirmation alert continues to fire before submission (Requirements 3.5)_
    - _Requirements: 1.4, 2.4, 3.5_

  - [ ] 3.5 Fix Site 5 — Redesign Ingredients tab with plain-English breakdown, accordion, and allergen highlighting
    - In `omniscan-ui/src/views/PantryItemDetail.vue`, import `chevronUpOutline` and `chevronDownOutline` from `ionicons/icons`
    - Add `const rawIngredientsOpen = ref(false)` for accordion state
    - Add `hasSimplifiedIngredients` computed: returns true when `simplified_ingredients` is a non-empty string that is not `'Unknown'` (case-insensitive)
    - Add `escapeHtml(str)` helper function that escapes `&`, `<`, `>`, `"`, `'` to prevent XSS via `v-html`
    - Add `highlightedSimplifiedIngredients` computed: escapes simplification text (falls back to `ingredient_text` or fallback message), then for each allergen in `matched_user_allergens` wraps case-insensitive matches in `<span class="ingredient-allergen-highlight">$1</span>`
    - Replace the Ingredients tab template block with two cards: (1) "Plain English Breakdown" card (always visible, shows `highlightedSimplifiedIngredients` via `v-html`, with muted note if no simplification available); (2) "Full Ingredient List" collapsible accordion card (only if `ingredient_text` exists, collapsed by default)
    - Add scoped CSS for `.ingredient-allergen-highlight`, `.ingredients-accordion-header`, `.accordion-chevron`, `.ingredients-accordion-body`, `.ingredients-text--muted`
    - Append dark-mode CSS rule `html.ion-palette-dark .ingredient-allergen-highlight { background: #450a0a; color: #fca5a5; border-color: #b91c1c; }` to `omniscan-ui/src/theme/dark-mode.css`
    - _Bug_Condition: isBugCondition({ site: 'ingredients_tab' }) — template uses single flat text block, allergen terms not highlighted_
    - _Expected_Behavior: Ingredients tab renders "Plain English Breakdown" section (always visible) and collapsible "Full Ingredient List" accordion; allergen terms wrapped in ingredient-allergen-highlight spans per design Fix 5_
    - _Preservation: Overview and Alternatives tabs unchanged; no-ingredient fallback message preserved; dark mode styling applied correctly (Requirements 3.6, 3.7)_
    - _Requirements: 1.5, 2.5, 3.6, 3.7_

  - [ ] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Simplified Ingredients Pipeline Defects (All 5 Sites)
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior for all five sites
    - When these tests pass, it confirms the expected behavior is satisfied across the full pipeline
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms all five pipeline defects are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Pipeline and UI Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions introduced)
    - Confirm all existing behaviors are preserved: scan field extraction, upload non-food handling, barcode scan path, allergen guardrail, tab rendering, fallback message

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite to confirm all tests pass
  - Verify Property 1 (bug condition) tests pass — all five pipeline defects resolved
  - Verify Property 2 (preservation) tests pass — no regressions
  - Ensure all unit tests pass: `buildPrompt()` rules, `buildAnalyzePrompt()` JSON shape, `coerceUploadExtraction()` with valid/empty/null/missing values, pantry create handler priority rule, `escapeHtml()` XSS cases, `hasSimplifiedIngredients` computed, `highlightedSimplifiedIngredients` computed
  - Ask the user if any questions arise
