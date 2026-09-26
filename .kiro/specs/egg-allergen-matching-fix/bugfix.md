# Bugfix Requirements Document

## Introduction

Users who have configured an "Eggs-free" dietary preference receive no allergen warning when uploading a photo of an egg product (e.g. a bowl of eggs or a carton of eggs). The pantry item upload flow silently accepts the product without alerting the user to the allergen match.

The bug stems from two compounding issues in the upload analysis path (`analyze.post.ts`):

1. **Primary cause**: The allergen matching logic only searches `ingredients_text`. Raw whole-food products (e.g. eggs, fruit, vegetables) have no printed ingredient list, so `ingredients_text` is empty — meaning both the deterministic string matcher and the semantic LLM matcher receive empty text and return zero matches. The `product_name` field (which would contain "eggs") is never included in the search.

2. **Secondary cause**: The `IngredientMapping` table has no rows seeded for any allergen, including "Eggs". The `allergen.seeder.ts` defines allergen records but no `IngredientMapping` entries, so the term list used by `findMatchedUserAllergens()` falls back to only the allergen `name` ("Eggs") and `scientific_name` ("Ovalbumin"). For a raw egg product the primary cause is decisive, but richer synonym coverage would improve match quality for packaged products too.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user with an "Eggs-free" allergen preference uploads a photo of a raw egg product (e.g. a bowl of eggs, a carton of eggs) AND the AI extraction returns an empty `ingredients_text` THEN the system returns `matched_user_allergens: []` and shows no allergen warning.

1.2 WHEN a user with an "Eggs-free" allergen preference uploads a photo of a raw egg product AND `ingredients_text` is empty THEN the system passes the empty string to `matchUserAllergensSemantically()`, which immediately returns `[]` due to its early-return guard for blank input, bypassing LLM semantic analysis entirely.

1.3 WHEN `allergen.seeder.ts` is run THEN the system seeds `Allergen` records with no associated `IngredientMapping` rows, leaving the synonym term list for every allergen empty and reducing string-match coverage to only the allergen `name` and `scientific_name`.

### Expected Behavior (Correct)

2.1 WHEN a user with an "Eggs-free" allergen preference uploads a photo of a raw egg product AND the AI extraction returns a non-empty `product_name` (e.g. "eggs") with an empty `ingredients_text` THEN the system SHALL combine `product_name` and `ingredients_text` into a single search text and use it for allergen matching, causing the product to match the "Eggs" allergen and surface an allergen warning.

2.2 WHEN the combined search text (product_name + ingredients_text) is non-empty THEN the system SHALL pass it to both `findMatchedUserAllergens()` and `matchUserAllergensSemantically()`, ensuring neither matcher is bypassed due to empty `ingredients_text` alone.

2.3 WHEN `allergen.seeder.ts` is run THEN the system SHALL seed comprehensive `IngredientMapping` rows for each allergen, covering common egg derivatives (e.g. "egg", "egg white", "egg yolk", "albumen", "ovalbumin", "ovomucin", "lysozyme", "mayonnaise") and equivalent synonym sets for all other allergens, so that string matching catches derivative ingredient terms in packaged product labels.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user with no allergen preferences uploads any food product THEN the system SHALL CONTINUE TO return `matched_user_allergens: []` and show no allergen warning.

3.2 WHEN a user uploads a packaged product whose `ingredients_text` already contains an allergen term THEN the system SHALL CONTINUE TO detect the allergen match and return the correct `matched_user_allergens` result.

3.3 WHEN a user uploads a non-food item THEN the system SHALL CONTINUE TO return `is_food_product: false` with empty allergen matches, without performing any allergen matching.

3.4 WHEN a user uploads a food product whose `product_name` and `ingredients_text` contain no allergen terms for their profile THEN the system SHALL CONTINUE TO return `matched_user_allergens: []` and show no false-positive allergen warning.

3.5 WHEN a user uploads a food product whose `ingredients_text` contains a non-egg allergen term (e.g. "milk", "peanut") THEN the system SHALL CONTINUE TO detect and report those allergen matches correctly, unaffected by this change.
