# Bugfix Requirements Document

## Introduction

The photo-upload pipeline (`POST /api/pantry_item/analyze` + `PhotoPantryUploadModal.vue`) is missing allergen evaluation entirely. When a user photographs a food label and adds it to their pantry via the upload flow, their personal allergen profile is never consulted — the backend returns no `matched_user_allergens` data, Step 2 of the modal shows no allergen warning, and `handleSubmit()` adds the item without any allergen confirmation. This is a behavioral parity gap compared to the camera-scan flow (`POST /api/scan` + `ScanResultModal.vue`), which does perform full allergen matching and surfaces alerts. The risk is that users with food allergies unknowingly add dangerous products to their pantry through the upload path.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a logged-in user submits an image to `POST /api/pantry_item/analyze` THEN the system returns OCR extraction data without querying the user's allergen records or performing any allergen matching

1.2 WHEN `POST /api/pantry_item/analyze` completes successfully THEN the system response omits any `matched_user_allergens` field, even if the extracted ingredients contain allergens from the user's profile

1.3 WHEN a user reaches Step 2 of `PhotoPantryUploadModal.vue` after a successful analyze call THEN the system displays no allergen alert banner, regardless of whether the detected ingredients contain the user's allergens

1.4 WHEN a user taps "Add to Pantry" in `PhotoPantryUploadModal.vue` and the product contains one or more of their registered allergens THEN the system adds the item to the pantry immediately with no confirmation prompt

### Expected Behavior (Correct)

2.1 WHEN a logged-in user submits an image to `POST /api/pantry_item/analyze` THEN the system SHALL query the user's allergen records from the database using the same Prisma select pattern as the scan endpoint

2.2 WHEN `POST /api/pantry_item/analyze` has extracted ingredients text and loaded the user's allergens THEN the system SHALL call `findMatchedUserAllergens()`, `matchUserAllergensSemantically()`, and `mergeMatchedAllergens()` on the extracted ingredients, and return `matched_user_allergens: string[]` (allergen names only) alongside the existing OCR fields

2.3 WHEN `PhotoPantryUploadModal.vue` receives a response containing a non-empty `matched_user_allergens` array THEN the system SHALL display a `personal-allergen-alert` banner in Step 2 that reads "Contains your allergen(s): [comma-separated name list]"

2.4 WHEN a user taps "Add to Pantry" in `PhotoPantryUploadModal.vue` and `matchedUserAllergens` is non-empty THEN the system SHALL present an `alertController` confirmation dialog before proceeding, reading "This item contains allergens matching your dietary profile. Are you sure you want to add it to your pantry?" with "Cancel" and "Add Anyway" buttons

2.5 WHEN the user selects "Cancel" in the allergen confirmation dialog THEN the system SHALL abort the pantry item creation and keep the user on Step 2

2.6 WHEN the user selects "Add Anyway" in the allergen confirmation dialog THEN the system SHALL proceed with the `POST /api/pantry_item` call as normal

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `POST /api/pantry_item/analyze` is called and the extracted `ingredients_text` is empty or the user has no registered allergens THEN the system SHALL CONTINUE TO return a response in the same shape as before, with `matched_user_allergens` as an empty array and no change to other fields

3.2 WHEN `POST /api/pantry_item/analyze` is called and the image is not a food product THEN the system SHALL CONTINUE TO return `{ is_food_product: false }` immediately without performing any allergen lookup

3.3 WHEN a user reaches Step 2 of `PhotoPantryUploadModal.vue` with no allergen matches THEN the system SHALL CONTINUE TO display the details form with no allergen banner, preserving the current Step 2 layout

3.4 WHEN a user taps "Add to Pantry" with no allergen matches THEN the system SHALL CONTINUE TO submit the pantry item directly without any confirmation dialog, preserving the existing submission flow

3.5 WHEN `POST /api/pantry_item/analyze` is called and the AI vision service is unreachable or returns an error THEN the system SHALL CONTINUE TO return the same 502 error responses as before, with no change to error handling behaviour

3.6 WHEN the scan endpoint (`POST /api/scan`) is called THEN the system SHALL CONTINUE TO operate exactly as before — this fix must not touch the scan flow

---

## Bug Condition Derivation

**Bug Condition Function** — identifies inputs that expose the missing allergen evaluation:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type UploadRequest
  OUTPUT: boolean

  // The bug manifests whenever the upload path is used by an authenticated user
  // with at least one allergen that appears in the extracted ingredients
  RETURN X.user.allergens.length > 0
     AND X.extractedIngredientsText ≠ ""
     AND INTERSECT(X.user.allergens, X.extractedIngredientsText) ≠ ∅
END FUNCTION
```

**Property: Fix Checking**

```pascal
// For all upload requests where the bug condition holds:
FOR ALL X WHERE isBugCondition(X) DO
  response ← analyzeEndpoint'(X)           // F' = fixed endpoint
  ASSERT response.matched_user_allergens IS ARRAY
  ASSERT response.matched_user_allergens.length > 0
  ASSERT allergenBannerVisible IN Step2UI
  ASSERT confirmationDialogShown BEFORE pantryItemCreated
END FOR
```

**Property: Preservation Checking**

```pascal
// For all upload requests where the bug condition does NOT hold:
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT analyzeEndpoint(X) = analyzeEndpoint'(X)   // F = F'
  // No allergen banner shown, no confirmation dialog, submission proceeds uninterrupted
END FOR
```
