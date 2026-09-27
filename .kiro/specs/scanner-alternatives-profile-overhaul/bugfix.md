# Bugfix Requirements Document

## Introduction

OmniScan has four feature additions that improve image validation, allergen-aware alternative suggestions, and the profile editing experience. Together they form a cohesive overhaul of the scanner output and dietary-profile flows.

**Feature 1 — Real Food / Anti-Cartoon Validation**: The scanner currently only checks whether an image depicts a food product but does not distinguish genuine photographs from cartoons, drawings, illustrations, or digital art. Users who scan a cartoon of food receive a full scan result, which is misleading and incorrect. The fix adds an `is_real_photo` AI field that rejects non-photographic depictions before processing proceeds.

**Feature 2 — Show Alternatives Button + AI Endpoint**: When the scan result shows allergen alerts, the UI offers no way to discover alternative products unless the scanned item happens to be in the catalog variant group. A new AI-powered suggestions endpoint and a collapsible "Show Alternatives" button surface relevant alternatives for any product, even ones not in the catalog.

**Feature 3 — Profile Edit Modal Redesign**: The dietary preferences section in the profile edit modal uses a freetext input and an ad-hoc quick-add chip list. "Halal" is mixed together with allergen preferences, making the distinction between a religious requirement and an allergen unclear. The redesign separates Halal into a dedicated toggle and replaces the freetext input with a structured WHO allergen checklist.

**Feature 4 — Profile Summary Reorganization**: The profile page displays Halal and allergen preferences together under a single "Dietary Preferences" heading. The fix splits them into two clearly labeled sections — one for religious preference and one for the allergen list.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user scans an image that is a cartoon, drawing, illustration, anime artwork, digital art, painting, emoji, or screenshot of an app THEN the system performs a full scan and returns product results as if it were a real photo of food.

1.2 WHEN the scan result modal shows personal allergen alerts THEN the system does not offer any mechanism to discover alternative products unless the scanned item belongs to a catalog variant group.

1.3 WHEN the scan result has no catalog-matched alternatives THEN the system displays only the static message "No known alternatives for this product yet." with no way for the user to request AI-generated suggestions.

1.4 WHEN the user opens the profile edit modal THEN the system presents Halal as a chip inside the same "Dietary Preferences" section as allergen preferences, making it visually indistinguishable from allergen choices.

1.5 WHEN the user edits dietary preferences THEN the system offers a freetext custom input field and a short quick-add chip list, which allows inconsistent or unmapped allergen strings that may not match the allergen detection logic.

1.6 WHEN the profile summary page displays preferences THEN the system shows Halal and all allergen preferences together under a single "Dietary Preferences" heading, providing no visual distinction between a religious requirement and food allergens.

1.7 WHEN a user uploads a photo in the Photo Pantry upload flow and the image is a cartoon or illustration of food THEN the system does not reject it as a non-real-photo; it passes the `is_food_product` check and proceeds to step 2.

### Expected Behavior (Correct)

2.1 WHEN a user scans an image and the AI determines `is_real_photo` is false THEN the system SHALL reject the scan with HTTP 422 and the message "Please scan a real photo of a food product — cartoons, drawings, and illustrations are not supported."

2.2 WHEN a user uploads a pantry photo and the AI determines `is_real_photo` is false THEN the system SHALL set `nonFoodDetected` to true and display the message "Cartoons and drawings are not supported. Please upload a real photo of a food item."

2.3 WHEN the scan result modal shows personal allergen alerts THEN the system SHALL display a "Show Alternatives" button below the allergen banner.

2.4 WHEN the user presses "Show Alternatives" and no alternatives have been fetched yet THEN the system SHALL call `GET /api/alternatives/ai-suggest?product_name=…&brand_name=…&user_allergens=…` and display the results.

2.5 WHEN the AI suggest endpoint returns suggestions THEN the system SHALL render each suggestion with its `product_name`, `brand_name`, and `reason` fields in the collapsible alternatives section.

2.6 WHEN the user opens the profile edit modal THEN the system SHALL display a dedicated Halal toggle row (labeled "Halal" with sublabel "Religious dietary requirement") separate from the allergen section.

2.7 WHEN the user edits allergen preferences THEN the system SHALL present a structured WHO allergen checklist with 14 standard entries, each as a labeled checkbox.

2.8 WHEN the profile summary page renders THEN the system SHALL display Halal under a "Religious Preference" heading and allergen preferences under an "Allergens / Allergy List" heading as two separate sections.

2.9 WHEN the `GET /api/alternatives/ai-suggest` endpoint is called THEN the system SHALL require authentication, read `product_name`, `brand_name`, and `user_allergens` from the query string, call the `GENERATION_MODEL` with a structured prompt, and return `{ suggestions: Array<{product_name, brand_name, reason}> }`.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user scans a genuine real-world photograph of a food product THEN the system SHALL CONTINUE TO process the scan normally without any change to extraction, allergen matching, halal detection, or the scan response shape.

3.2 WHEN a user scans an image that is not a food product (e.g. electronics, cosmetics) and `is_food_product` is false THEN the system SHALL CONTINUE TO throw HTTP 422 with the existing non-food message, independently of the `is_real_photo` check.

3.3 WHEN the scan result modal shows no personal allergen alerts THEN the system SHALL CONTINUE TO display the alternatives section in its current form (catalog-based or empty message), with no "Show Alternatives" button shown.

3.4 WHEN catalog-matched alternatives exist for a scanned product THEN the system SHALL CONTINUE TO display those catalog alternatives in the alternatives section as before.

3.5 WHEN the user removes an existing custom preference chip in the profile edit modal THEN the system SHALL CONTINUE TO remove it via `removeCustomPreference`, preserving backward compatibility with old freetext data already stored.

3.6 WHEN the user saves their profile THEN the system SHALL CONTINUE TO persist `halal_pref`, `custom_preferences`, and `allergen_ids` to the API in the same format as before.

3.7 WHEN the profile page loads for a user with no dietary preferences set THEN the system SHALL CONTINUE TO show no preference summary sections.

3.8 WHEN the `GET /api/alternatives/index.get.ts` endpoint is called THEN the system SHALL CONTINUE TO return catalog-based alternatives without any changes.
