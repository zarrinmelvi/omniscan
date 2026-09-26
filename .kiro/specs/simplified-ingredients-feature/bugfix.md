# Bugfix Requirements Document

## Introduction

Four related defects prevent the Ingredients tab from delivering meaningful, allergen-aware ingredient information to users. The scan flow produces a vague AI simplification, the upload flow never produces one at all, the upload creation endpoint discards any simplification that could be forwarded, and the detail view presents a flat undifferentiated text block with no visual distinction between raw and plain-English text and no allergen highlighting. Together these defects mean a user checking for allergens in an uploaded product sees the same raw OCR text they would see without the feature, and even for scanned products the simplified text lacks the chemical-name explanations and hidden-allergen identification that make it useful.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the scan endpoint asks the AI to produce `simplified_ingredients` THEN the system instructs the AI only to "restate that list in plain, easy-to-understand language for someone checking for allergens, without adding health claims", with no instruction to explain chemical or technical ingredient names, no instruction to identify hidden allergen derivatives, and no instruction on output format, resulting in a restatement that is often as technical as the original

1.2 WHEN a user uploads a product photo via the upload flow THEN the system's `analyze.post.ts` AI prompt does not include `simplified_ingredients` in its JSON shape definition, its `UploadAiExtraction` interface, its `coerceUploadExtraction` function, or its return statement, so no plain-English ingredient breakdown is ever produced for uploaded items

1.3 WHEN an uploaded product is created via `pantry_item/index.post.ts` THEN the system's `CreatePantryItemBody` has no `simplified_ingredients` field, and the product create call hard-codes `simplified_ingredients: ingredient_text?.trim() || 'Unknown'`, copying the raw OCR text as the simplified version even when a proper AI-generated simplification exists in the analyze response

1.4 WHEN `PhotoPantryUploadModal.vue` sends the analyze result to step 2 and then submits the form THEN the system does not store `simplified_ingredients` in the `AnalyzeResult` interface, does not populate it in the `form` reactive object in `goToStep2()`, and does not include it in the POST body sent to `pantry_item/index.post.ts`, so the AI simplification is silently discarded

1.5 WHEN a user opens the Ingredients tab in `PantryItemDetail.vue` THEN the system renders a single text block showing `item.product.simplified_ingredients || item.product.ingredient_text`, with no visual separation between the raw ingredient list and the plain-English breakdown, and no highlighting of words or phrases that match the user's allergens from `item.matched_user_allergens`

### Expected Behavior (Correct)

2.1 WHEN the scan endpoint asks the AI to produce `simplified_ingredients` THEN the system SHALL instruct the AI to explain chemical and technical names in plain language (e.g. "Alpha-tocopherol (Vitamin E)", "Carrageenan (seaweed thickener)"), identify hidden allergen derivatives by naming their source (e.g. "Casein (milk protein)", "Hydrolyzed wheat protein (gluten source)"), and format the result as a comma-separated plain-language list

2.2 WHEN a user uploads a product photo via the upload flow THEN the system SHALL include `simplified_ingredients` as a `string` field in the `UploadAiExtraction` interface, the prompt JSON shape, the `buildAnalyzePrompt()` instructions (using the same enriched guidance as Fix 1), and the `coerceUploadExtraction` function, and SHALL include it in the endpoint's return value

2.3 WHEN an uploaded product is created via `pantry_item/index.post.ts` THEN the system SHALL accept `simplified_ingredients?: string` in `CreatePantryItemBody` and SHALL use the received value (when present and non-empty) rather than falling back to `ingredient_text`, storing the AI-produced plain-English breakdown in the product's `simplified_ingredients` column

2.4 WHEN `PhotoPantryUploadModal.vue` receives the analyze result in `goToStep2()` THEN the system SHALL store `result.simplified_ingredients` in a `simplifiedIngredientsText` field on the `form` reactive object, include `simplified_ingredients?: string` in the `AnalyzeResult` interface, and pass `simplified_ingredients: form.simplifiedIngredientsText` in the POST body sent to `pantry_item/index.post.ts`

2.5 WHEN a user opens the Ingredients tab in `PantryItemDetail.vue` THEN the system SHALL render two distinct sections: a collapsible "Full Ingredient List" accordion (collapsed by default) showing `item.product.ingredient_text`, and an always-visible "Plain English Breakdown" section showing `item.product.simplified_ingredients` (falling back to the raw text with an explanatory note if absent or "Unknown"), where any word or phrase from `item.matched_user_allergens` that appears in the simplified text SHALL be wrapped in a highlighted span with class `ingredient-allergen-highlight` styled as a bold inline chip in a red or orange colour

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the scan endpoint processes a food product image THEN the system SHALL CONTINUE TO extract and return all existing fields (`is_food_product`, `product_name`, `brand`, `ingredients_text`, `halal_logo_detected`, `certifying_body`, `expiration_date`, `net_quantity`, `net_unit`) with the same logic and coercion rules as before

3.2 WHEN the scan endpoint falls back to a catalog product match because the AI returned empty ingredient text THEN the system SHALL CONTINUE TO populate `ingredient_text` and `simplified_ingredients` from the catalog match

3.3 WHEN the upload analyze endpoint processes a non-food image THEN the system SHALL CONTINUE TO return `is_food_product: false` with empty strings for text fields and null for date and quantity fields

3.4 WHEN `pantry_item/index.post.ts` receives a request with a known `product_id` (barcode scan flow) THEN the system SHALL CONTINUE TO look up the existing product without creating a new one and SHALL NOT be affected by the new `simplified_ingredients` field

3.5 WHEN `PhotoPantryUploadModal.vue`'s allergen guardrail detects a match in `matchedUserAllergens` THEN the system SHALL CONTINUE TO show the confirmation alert before allowing the form to submit

3.6 WHEN a user opens the Ingredients tab for a product that has no `ingredient_text` and no `simplified_ingredients` THEN the system SHALL CONTINUE TO display a "No ingredient information available for this item." fallback message

3.7 WHEN a user opens any tab other than Ingredients in `PantryItemDetail.vue` THEN the system SHALL CONTINUE TO render the Overview and Alternatives tabs without change
