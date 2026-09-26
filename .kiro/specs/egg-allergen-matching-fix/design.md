# Egg Allergen Matching Bugfix Design

## Overview

Users who have configured an "Eggs-free" dietary preference receive no allergen warning when uploading a photo of a raw egg product (e.g., a bowl of eggs or a carton). The upload analysis endpoint (`analyze.post.ts`) passes only `extraction.ingredients_text` to both allergen matchers. Raw whole-food products have no printed ingredient list, so `ingredients_text` is `""`. Both the string matcher and the semantic LLM matcher receive empty text, return `[]` immediately, and the `product_name` field — which the AI correctly sets to "eggs" — is never searched.

A secondary data-quality issue compounds this: the `IngredientMapping` table has no seeded rows for any allergen, so even for packaged products the string matcher can only match on the bare allergen name or scientific name.

The fix has two independent parts:
1. **`analyze.post.ts` (primary)** — build a `combinedText` from `product_name + ingredients_text` before passing to both matchers, mirroring the pattern already used by the scan endpoint.
2. **`allergen.seeder.ts` / `seed.ts` (secondary)** — seed comprehensive `IngredientMapping` rows for all 10 allergens to improve string-match coverage for packaged products.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — an upload where `ingredients_text` is empty and `product_name` alone identifies the allergen.
- **Property (P)**: The desired behavior — the system correctly detects an allergen match and returns it in `matched_user_allergens`.
- **Preservation**: Existing behavior that must remain unchanged — allergen detection for packaged products with non-empty `ingredients_text`, non-food item handling, and the no-false-positive guarantee.
- **`combinedText`**: The concatenation `"${extraction.product_name} ${extraction.ingredients_text}".trim()` — the search text passed to both matchers after the fix.
- **`findMatchedUserAllergens(text, allergens)`**: Deterministic substring matcher in `server/lib/allergen-matching.ts` — searches `text` for allergen names, scientific names, and `IngredientMapping` terms.
- **`matchUserAllergensSemantically(text, allergens)`**: LLM-based semantic matcher in the same file — has an early-return guard that skips matching when `text.trim()` is empty.
- **`IngredientMapping`**: Prisma model that stores synonym/derivative terms for an allergen (e.g., "egg white", "albumen" for Eggs).
- **`allergenSeeder()`**: Factory in `prisma/seeders/allergen.seeder.ts` that returns the base allergen records.
- **`seed.ts`**: Entry point in `prisma/seed.ts` that orchestrates all seeding within a single Prisma transaction.

---

## Bug Details

### Bug Condition

The bug manifests when a user with at least one allergen preference uploads a food product whose `ingredients_text` is empty (typical of raw whole foods) but whose `product_name` matches their allergen. The `analyze.post.ts` handler passes only the empty `ingredients_text` to both matchers, so neither can detect the match.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input — the result of coerceUploadExtraction() containing:
           { is_food_product: boolean, product_name: string, ingredients_text: string }
         AND the calling user has at least one allergen preference

  OUTPUT: boolean

  RETURN input.is_food_product = true
         AND input.ingredients_text.trim() = ""
         AND input.product_name.trim() != ""
         AND allergenMatchedByName(input.product_name, userAllergens) = true
         AND NOT allergenMatchedByName(input.ingredients_text, userAllergens)
END FUNCTION
```

### Examples

- **Raw eggs**: AI returns `{ product_name: "eggs", ingredients_text: "" }`. User has "Eggs" preference. Current code passes `""` to matchers → `matched_user_allergens: []`. No warning shown. **Bug confirmed.**
- **Egg carton**: AI returns `{ product_name: "Eggs", ingredients_text: "" }`. Same outcome. **Bug confirmed.**
- **Packaged mayonnaise**: AI returns `{ product_name: "Mayonnaise", ingredients_text: "water, egg yolk, vinegar" }`. `ingredients_text` is non-empty, so string matcher finds "egg yolk" in `IngredientMapping` (after Fix 2). **Not a bug condition; already works if IngredientMapping has entries.**
- **Garlic bulb** (user has no matching allergen): AI returns `{ product_name: "garlic", ingredients_text: "" }`. Bug condition shape, but no allergen match — `matched_user_allergens: []` is correct. **Not a bug condition.**

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Uploads of packaged products whose `ingredients_text` already contains an allergen term SHALL continue to be detected correctly.
- Uploads by users with no allergen preferences SHALL continue to return `matched_user_allergens: []`.
- Uploads of non-food items SHALL continue to return `{ is_food_product: false }` and skip allergen matching entirely.
- Uploads of food products (raw or packaged) whose combined text contains no term matching the user's allergen profile SHALL continue to return `matched_user_allergens: []` — no false positives introduced.
- Uploads of products triggering a non-egg allergen match (e.g., "milk", "peanut" in `ingredients_text`) SHALL continue to be detected without regression.

**Scope:**
All uploads where `ingredients_text` is already non-empty are unaffected in terms of code path; including `product_name` in the combined text simply adds a short prefix and does not disrupt existing matches. The allergen seeder change only adds rows; it does not modify or delete existing records.

---

## Hypothesized Root Cause

Based on the bug description and code review:

1. **Missing `product_name` in search text (`analyze.post.ts`)**: The two matcher calls on lines 158–159 use only `extraction.ingredients_text`. Raw produce returns `ingredients_text: ""` from the AI, so both matchers receive blank input. The scan endpoint already uses a `combinedIngredientText` variable for this reason; the upload endpoint omits the equivalent pattern. This is the decisive cause.

2. **Early-return guard in `matchUserAllergensSemantically`**: The function contains `if (allergens.length === 0 || !ingredientsText.trim()) return []`. With an empty `ingredients_text`, the semantic LLM call is short-circuited entirely. This guard is correct behavior for blank input — the real fix is to pass non-blank input by including `product_name`.

3. **Empty `IngredientMapping` table**: `allergen.seeder.ts` returns only the 10 base `Allergen` records with no associated `IngredientMapping` rows. `findMatchedUserAllergens` therefore searches only the allergen `name` and `scientific_name` against `ingredients_text`. For raw produce this is moot (ingredients_text is empty), but for packaged products containing derivative terms like "albumen" or "whey", the current seeder misses those matches.

4. **Inconsistency with scan endpoint**: The scan endpoint constructs a combined text (`ingredients_text + simplified_ingredients`) before calling matchers. The upload endpoint was written without adopting this established pattern.

---

## Correctness Properties

Property 1: Bug Condition — Raw Whole-Food Product Name Triggers Allergen Match

_For any_ upload where `isBugCondition` returns true (i.e., `is_food_product` is true, `ingredients_text` is empty, `product_name` is non-empty, and `product_name` matches the user's allergen), the fixed `analyze.post.ts` handler SHALL include `product_name` in the search text passed to both `findMatchedUserAllergens` and `matchUserAllergensSemantically`, resulting in a non-empty `matched_user_allergens` array containing the matched allergen name.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Existing Allergen Detection and Non-Bug Inputs Unchanged

_For any_ upload where `isBugCondition` returns false (packaged products with non-empty `ingredients_text`, products with no allergen match, non-food items, users with no allergen preferences), the fixed handler SHALL produce the same `matched_user_allergens` result as the original handler, preserving all existing correct behavior and introducing no false positives.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

Property 3: Ingredient Mapping Coverage — Seeded Synonyms Match Derivative Terms

_For any_ string matcher call where the search text contains a known egg derivative term (e.g., "albumen", "egg yolk", "ovomucin") and the user has an "Eggs" allergen preference, `findMatchedUserAllergens` SHALL return a match after `seed.ts` is run with the updated seeder, because the `IngredientMapping` rows for "Eggs" include those terms.

**Validates: Requirements 2.3**

---

## Fix Implementation

### Changes Required

**Fix 1 — Primary**

**File**: `server/api/pantry_item/analyze.post.ts`

**Location**: The two allergen-matching calls after the `userAllergens` fetch (currently ~lines 158–159).

**Specific Changes**:
1. **Introduce `combinedText`**: Before the two matcher calls, compute:
   ```ts
   const combinedText = `${extraction.product_name} ${extraction.ingredients_text}`.trim()
   ```
2. **Update string matcher call**: Change argument from `extraction.ingredients_text` to `combinedText`:
   ```ts
   const stringMatches = findMatchedUserAllergens(combinedText, userAllergens)
   ```
3. **Update semantic matcher call**: Change argument from `extraction.ingredients_text` to `combinedText`:
   ```ts
   const semanticMatches = await matchUserAllergensSemantically(combinedText, userAllergens)
   ```

No other changes to this file.

---

**Fix 2 — Secondary (Data Quality)**

**File**: `prisma/seeders/allergen.seeder.ts`

**Change**: Update the export to include `ingredient_mapping` arrays alongside each allergen record, so `seed.ts` can create `IngredientMapping` rows via nested Prisma creates.

**File**: `prisma/seed.ts`

**Change**: After `tx.allergen.createMany(...)`, add a block that fetches each seeded allergen by name and calls `tx.allergen.update()` with nested `ingredient_mapping: { createMany: { data: [...], skipDuplicates: true } }` for each allergen.

**Mappings to seed** (simplified_term values; scientific_term mirrors simplified_term for these entries):

| Allergen    | Simplified Terms                                                                                      |
|-------------|-------------------------------------------------------------------------------------------------------|
| Eggs        | egg, egg white, egg yolk, albumen, dried egg, powdered egg, egg solids, ovomucin, ovotransferrin, lysozyme, mayonnaise, meringue |
| Milk        | milk, cream, butter, cheese, lactose, whey, casein, caseinate, milk powder, lactalbumin, lactoglobulin, ghee, dairy |
| Peanuts     | peanut, peanut oil, groundnut, arachis oil, monkey nuts, groundnut oil                                |
| Wheat       | wheat, flour, bread crumbs, gluten, semolina, spelt, kamut, bulgur, durum, farro, wheat starch        |
| Soy         | soy, soya, soybean, tofu, tempeh, miso, tamari, edamame, soy lecithin, textured vegetable protein, tvp |
| Fish        | fish, anchovy, anchovy paste, bass, flounder, grouper, hake, herring, mackerel, mahi-mahi, perch, pike, pollock, salmon, tilapia, trout, tuna, fish sauce, fish oil, worcestershire |
| Shellfish   | shellfish, shrimp, prawn, crab, lobster, crayfish, langoustine, scallop, clam, oyster, mussel, squid, octopus |
| Tree Nuts   | tree nut, almond, cashew, walnut, pecan, pistachio, hazelnut, macadamia, brazil nut, pine nut, chestnut, coconut |
| Sesame      | sesame, sesame oil, tahini, sesame seed, til, gingelly oil                                            |
| Mustard     | mustard, mustard seed, mustard oil, mustard flour, mustard leaves                                     |

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code to confirm the root cause analysis; then verify the fix works correctly and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If refuted, re-hypothesize.

**Test Plan**: Write unit tests for `analyze.post.ts` (or its extracted logic) that simulate an AI extraction with `ingredients_text: ""` and `product_name: "eggs"` for a user with an "Eggs" allergen, and assert that `matched_user_allergens` contains `"Eggs"`. Run against the unfixed code to observe that the assertion fails.

**Test Cases**:
1. **Raw egg upload — string match path** (will fail on unfixed code): Given `{ product_name: "eggs", ingredients_text: "" }` and user allergen "Eggs", assert `matched_user_allergens` includes "Eggs".
2. **Raw egg upload — case-insensitive** (will fail on unfixed code): Given `{ product_name: "Eggs", ingredients_text: "" }`, same assertion.
3. **Raw milk upload** (will fail on unfixed code): Given `{ product_name: "milk", ingredients_text: "" }` and user allergen "Milk", assert match.
4. **Raw product, wrong allergen** (should pass on unfixed code): Given `{ product_name: "apple", ingredients_text: "" }` and user allergen "Eggs", assert `matched_user_allergens` is empty.

**Expected Counterexamples**:
- `matched_user_allergens` is `[]` when it should contain `"Eggs"` — confirms the matchers never see `product_name`.
- The `matchUserAllergensSemantically` early-return guard fires immediately for `""` — confirms LLM bypass.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  combinedText := (input.product_name + " " + input.ingredients_text).trim()
  stringMatches := findMatchedUserAllergens(combinedText, userAllergens)
  semanticMatches := matchUserAllergensSemantically(combinedText, userAllergens)
  result := mergeMatchedAllergens(stringMatches, semanticMatches)
  ASSERT result.length > 0
  ASSERT result[0].name IN userAllergenNames
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT analyze_original(input) = analyze_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the full input domain.
- It catches edge cases (e.g., product names that are substrings of allergen names, special characters) that manual tests miss.
- It provides strong guarantees that adding `product_name` to the search text does not introduce false positives.

**Test Plan**: Observe the behavior of the original code for packaged products and no-allergen scenarios, then write property-based tests asserting those results are unchanged after the fix.

**Test Cases**:
1. **Packaged product with allergen in `ingredients_text`**: Verify the existing match is still returned after fix (no regression).
2. **User with no allergen preferences**: Verify `matched_user_allergens` remains `[]` regardless of `product_name`.
3. **Non-food item**: Verify the handler returns `{ is_food_product: false }` without entering allergen matching.
4. **Product name with no allergen match**: Verify no false positive is introduced when `product_name` contains no allergen term.
5. **`product_name` is substring of longer allergen name**: Verify no spurious match (e.g., `product_name: "nut butter"` for a "Tree Nuts" user — depends on substring rules).

### Unit Tests

- Test `findMatchedUserAllergens` with `combinedText` containing only `product_name` — verifies the fix works at the library level.
- Test `matchUserAllergensSemantically` receives non-empty text after fix — verifies the early-return guard is bypassed.
- Test `coerceUploadExtraction` returns correct `product_name` and `ingredients_text` shapes for various AI responses.
- Test edge case: `product_name` is empty and `ingredients_text` is empty → `matched_user_allergens: []` (no crash, no false positive).
- Test edge case: `product_name` contains an allergen term but user has no matching allergen preference → `matched_user_allergens: []`.

### Property-Based Tests

- Generate random `(product_name, ingredients_text)` pairs where neither contains any allergen term; assert `matched_user_allergens` is always `[]` (no false positives across many inputs).
- Generate random `ingredients_text` values that already produce a match in the original code; assert the fixed code produces the same or superset match (no regressions).
- Generate random allergen-term-containing `product_name` values with empty `ingredients_text`; assert the fixed code always returns the correct match (fix checking across many inputs).

### Integration Tests

- Upload a raw-egg image through the full API; assert the response `matched_user_allergens` contains `"Eggs"` for a user with that preference.
- Upload a packaged product with "contains: milk" in `ingredients_text`; assert `"Milk"` is in `matched_user_allergens` (regression check).
- Upload a non-food item; assert `is_food_product: false` is returned with no allergen fields.
- Run the seeder; upload a packaged product containing "albumen"; assert "Eggs" is matched via the newly seeded `IngredientMapping` rows.
