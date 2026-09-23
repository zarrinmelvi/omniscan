# Requirements Document

## Introduction

The pantry photo upload flow in OmniScan currently requires users to fill in all product details
(name, expiration date, ingredients, etc.) manually after selecting a photo. This feature adds
AI-powered image analysis to the flow: when a user taps "Continue" on step 1, the system sends
the photo to the existing Gemma4:cloud vision model and uses the extracted data to pre-fill the
step 2 form fields, reducing manual entry and improving accuracy. It also gates non-food photos —
items not intended for human consumption — from entering the pantry at all, surfacing a clear
alert on step 1 instead of navigating forward.

---

## Requirements

### 1. New Backend Endpoint — POST /api/pantry_item/analyze

1.1 WHEN a POST request is made to `/api/pantry_item/analyze` without a valid session cookie
    THEN the system SHALL reject the request with HTTP 401 (enforced via `requireAuth`).

1.2 WHEN a POST request is made to `/api/pantry_item/analyze` with no multipart form data,
    or with form data that does not include an `image` field
    THEN the system SHALL return HTTP 400.

1.3 WHEN a valid authenticated POST request is made to `/api/pantry_item/analyze` with an
    `image` field in the multipart form body
    THEN the system SHALL send the image to the Gemma4:cloud vision model via `OLLAMA_ENDPOINT`
    using `SCAN_VISION_MODEL`, requesting extraction of:
    `is_food_product` (boolean), `product_name` (string), `expiration_date` (string | null),
    `ingredients_text` (string).

1.4 WHEN the AI returns a successful response and `is_food_product` is `true`
    THEN the system SHALL return HTTP 200 with JSON:
    `{ is_food_product: true, product_name: string, expiration_date: string | null, ingredients_text: string }`
    where `expiration_date` is normalized to `YYYY-MM-DD` via `normalizeToDateStringOrNull`
    (returns `null` if the value is absent, ambiguous, or not parseable).

1.5 WHEN the AI returns a successful response and `is_food_product` is `false`
    THEN the system SHALL return HTTP 200 with JSON:
    `{ is_food_product: false, product_name: "", expiration_date: null, ingredients_text: "" }`
    — it SHALL NOT throw an error; the frontend is responsible for handling the non-food state.

1.6 WHEN the call to the Ollama endpoint fails (network error or unreachable service)
    THEN the system SHALL return HTTP 502 with a `statusMessage` describing the failure.

1.7 WHEN the Ollama endpoint responds but returns an empty or non-JSON body
    THEN the system SHALL return HTTP 502 with a `statusMessage` describing the parse failure.

---

### 2. Frontend — goToStep2() AI Analysis Flow (PhotoPantryUploadModal.vue)

2.1 WHEN the user taps "Continue" on step 1 and a photo has been selected
    THEN the system SHALL set `isAnalyzing = true` before calling the analyze endpoint,
    showing a loading overlay on step 1 and disabling the "Continue" button.

2.2 WHEN `isAnalyzing` is `true`
    THEN the "Continue" button SHALL display "Analyzing…" with a spinner, and SHALL be disabled.

2.3 WHEN the analyze API call succeeds and `is_food_product === true`
    THEN the system SHALL set `isAnalyzing = false`, advance to step 2, and pre-fill form fields:
    - `form.productName` ← `product_name` (if non-empty string; otherwise left blank)
    - `form.expirationDate` ← `expiration_date` (if non-null `YYYY-MM-DD` string; otherwise left blank)
    - `form.ingredientsText` ← `ingredients_text` (displayed read-only on step 2 for reference; never sent to `/api/pantry_item`)

2.4 WHEN the analyze API call succeeds and `is_food_product === false`
    THEN the system SHALL set `isAnalyzing = false`, remain on step 1 (SHALL NOT advance to step 2),
    and set `nonFoodDetected = true` to display the non-food alert banner.

2.5 WHEN the analyze API call fails (network error, HTTP 502, or any non-2xx response)
    THEN the system SHALL set `isAnalyzing = false` and advance to step 2 with all form fields blank,
    allowing the user to fill in details manually (graceful degradation).

2.6 WHEN the user is on step 2 after AI pre-fill
    THEN the user SHALL be able to edit any pre-filled field before submitting.

---

### 3. Non-Food Detection — Alert Banner on Step 1 (PhotoPantryUploadModal.vue)

3.1 WHEN `nonFoodDetected` is `true`
    THEN the system SHALL display a visible alert banner on step 1 reading:
    "Non-food product detected. Only edible food items can be added to your pantry."

3.2 WHEN `nonFoodDetected` is `true`
    THEN the "Continue" button SHALL be disabled.

3.3 WHEN the user selects a new photo (a new `change` event fires on the file input)
    THEN the system SHALL clear `nonFoodDetected` (set to `false`) and hide the alert banner,
    resetting the step 1 state for the new selection.

3.4 WHEN `isAnalyzing` is `true`
    THEN the "Continue" button SHALL be disabled (regardless of `nonFoodDetected` state).

---

### 4. Step 2 — Ingredients Text Display (PhotoPantryUploadModal.vue)

4.1 WHEN the user arrives at step 2 after a successful AI analysis with a non-empty `ingredients_text`
    THEN the system SHALL display `ingredients_text` as a read-only block on step 2 for reference.

4.2 WHEN `ingredients_text` is an empty string or was not returned by the AI
    THEN the system SHALL NOT display the ingredients text block on step 2.

4.3 WHEN the user submits the pantry item form via `handleSubmit()`
    THEN `ingredients_text` SHALL NOT be included in the POST body sent to `/api/pantry_item`.
