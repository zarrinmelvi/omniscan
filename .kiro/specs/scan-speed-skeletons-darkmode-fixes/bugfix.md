# Bugfix Requirements Document

## Introduction

This spec covers five related defects in the Omniscan app (omniscan-ui and nitro-app):

1. Scanning/upload and Pantry loading are slower than desired, even after the already committed scan performance work (commit 9bef136, not yet pushed), which must be kept.
2. The Pantry Item Detail, Profile and Recipes pages show blank or jarring content while data loads, with no skeleton placeholders.
3. Recipe suggestions and the recipe maker treat flavored or processed pantry items (for example a lemon-flavored beverage) as the plain ingredient they are flavored like (for example lemon).
4. Login, Register and Forgot Password use different dark mode palettes (green-black vs navy) on the right-hand panel.
5. Several texts and a select on the Scan page and Scan Result modal are unreadable or inconsistent in dark mode.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user uploads or scans a product photo THEN the system takes longer than necessary to return a result, because the upload and scan response still carry heavy payloads (for example full base64 images) and avoidable sequential work remains.

1.2 WHEN a user opens the Pantry (including right after adding a scanned product via Add to Pantry) THEN the system loads slowly, because the pantry list response includes heavy per-item data (for example full base64 images) and the list is refetched or rendered more than needed.

1.3 WHEN the Pantry Item Detail page is loading its data THEN the system shows no skeleton placeholder (blank or abrupt content).

1.4 WHEN the Profile page is loading its data THEN the system shows no skeleton placeholder.

1.5 WHEN the Recipes page is loading recipes or suggestions THEN the system shows no skeleton placeholder.

1.6 WHEN a pantry item is a flavored or processed product (for example a lemon-flavored beverage, flavored snack, instant noodles) THEN the system matches it as the plain ingredient it is flavored like (for example lemon) and uses it in recipe suggestions and the recipe maker.

1.7 WHEN the user views Login or Register in dark mode THEN the system shows a green-black right panel (page #0b160b, inputs #172617), but WHEN the user views Forgot Password (and any other auth page such as reset-password or verify-email that uses it) in dark mode THEN the system shows a navy (#0f172a style) right panel, so the palette is inconsistent.

1.8 WHEN the Scan page status card shows "First photo captured. Now press Scan Again...", "Second photo captured. Please wait, upload in progress..." or "Please wait, upload in progress..." in dark mode THEN the system renders dark text on a dark card that is nearly invisible, and renders the "SKIP — USE FIRST PHOTO ONLY" link in a dark blue that is hard to read.

1.9 WHEN the Scan Result modal shows the Alternatives list in dark mode THEN the system renders each alternative's product name and description in dark gray on a dark background, barely visible.

1.10 WHEN the Add to Pantry form in the Scan Result is shown in dark mode THEN the system renders the Category select as a bright white box with blue text, unlike the other dark inputs, and the "Category" and "Storage Location" labels are low contrast.

### Expected Behavior (Correct)

2.1 WHEN a user uploads or scans a product photo THEN the system SHALL return the result noticeably faster than before by reducing payload size and removing avoidable sequential work, while keeping commit 9bef136 behavior intact.

2.2 WHEN a user opens the Pantry (including right after adding a scanned product) THEN the system SHALL load the list faster by returning only the data the list needs (no full base64 images per item in the list response, using lightweight image references or thumbnails instead) and avoiding redundant refetches, while the same information remains visible to the user.

2.3 WHEN the Pantry Item Detail page is loading THEN the system SHALL display skeleton placeholders (using the existing SkeletonCard component or equivalent) that match the page layout, and replace them with real content once loaded.

2.4 WHEN the Profile page is loading THEN the system SHALL display skeleton placeholders matching its layout, and replace them with real content once loaded.

2.5 WHEN the Recipes page is loading THEN the system SHALL display skeleton placeholders matching its layout, and replace them with real content once loaded.

2.6 WHEN a pantry item is a flavored or processed product (determined by its food_category, such as Beverages, Snacks, Instant Noodles, Canned Goods, Condiments & Sauces) THEN the system SHALL NOT count it as the plain ingredient it is flavored like, and SHALL only match and use real raw or cooking ingredients in recipe suggestions and the recipe maker.

2.7 WHEN the user views Login, Register, Forgot Password (and any other auth page such as reset-password or verify-email) in dark mode THEN the system SHALL use one consistent green-black palette: page #0b160b, surface #172617, border #2d4a2d, text #f9fafb. _Update: at user request the auth palette was changed to the app's navy tokens (page #0f172a, surface #1e293b, border #334155, text #f1f5f9) for consistency with the rest of the app._

2.8 WHEN the Scan page status card shows its messages in dark mode THEN the system SHALL render the message text in a light, readable color, and the "SKIP — USE FIRST PHOTO ONLY" link in a light, readable accent color.

2.9 WHEN the Scan Result modal shows the Alternatives list in dark mode THEN the system SHALL render each alternative's name in a bright color and its description in a readable light gray.

2.10 WHEN the Add to Pantry form in the Scan Result is shown in dark mode THEN the system SHALL render the Category select with a dark background and light text consistent with the other inputs, and SHALL render the "Category" and "Storage Location" labels in a readable light color.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a scan is performed THEN the system SHALL CONTINUE TO skip the allergen AI call for allergens already matched by plain text, apply the 8s semantic allergen timeout, run the alternatives lookup in parallel with DB writes, and write audit and activity logs together (commit 9bef136 is not reverted).

3.2 WHEN a user picks an image on the Scan page THEN the system SHALL CONTINUE TO resize it with resizeImageForUpload (max 1600px, JPEG 0.85) before upload, and scan results (product, ingredients, allergens, halal status, alternatives) SHALL CONTINUE TO be accurate and complete.

3.3 WHEN a Pantry item image is displayed in the list, detail, or scan result THEN the system SHALL CONTINUE TO show the item's image, and pantry data (name, category, quantity, expiry, storage location, allergens) SHALL CONTINUE TO be correct.

3.4 WHEN data has finished loading on Pantry Item Detail, Profile or Recipes THEN the system SHALL CONTINUE TO show the same content and behavior as before, in both light and dark mode, and error or empty states SHALL CONTINUE TO display as before.

3.5 WHEN a pantry item is a real raw or cooking ingredient (for example fresh lemon, rice, eggs, flour, vegetables, dairy, grains) THEN the system SHALL CONTINUE TO match it in recipe suggestions and the recipe maker.

3.6 WHEN the user views Login, Register or Forgot Password in light mode THEN the system SHALL CONTINUE TO show the existing light styling, and the left bright green gradient panel SHALL CONTINUE TO look the same in both modes.

3.7 WHEN the user views the rest of the app (Home, Pantry, etc.) in dark mode THEN the system SHALL CONTINUE TO use the existing navy theme, and dark-mode.css SHALL CONTINUE TO be unmodified.

3.8 WHEN text and controls on the Scan page and Scan Result modal are viewed in light mode THEN the system SHALL CONTINUE TO look the same, and the Net Content and Quantity fields in dark mode SHALL CONTINUE TO look the same.

3.9 WHEN the existing test and type checks are run THEN the nitro-app vitest suite (9 files / 75 tests) SHALL CONTINUE TO pass and omniscan-ui vue-tsc SHALL CONTINUE TO be clean, with no renames of existing functions, routes or fields.

## Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type AppInteraction
  OUTPUT: boolean

  RETURN (X.kind IN {Scan, PantryLoad} AND X.payloadIncludesFullBase64Images)
      OR (X.page IN {PantryItemDetail, Profile, Recipes} AND X.isLoading AND NOT X.showsSkeleton)
      OR (X.kind = RecipeMatch AND X.pantryItem.food_category IN {Beverages, Snacks, Instant Noodles, Canned Goods, Condiments & Sauces} AND X.matchedAsPlainIngredient)
      OR (X.page IN {Login, Register, ForgotPassword, AuthOther} AND X.darkMode AND X.rightPanelPalette != GreenBlack)
      OR (X.page IN {ScanPage, ScanResultModal} AND X.darkMode AND X.element IN {StatusCardMessage, SkipLink, AlternativeName, AlternativeDescription, CategorySelect, CategoryLabel, StorageLocationLabel} AND X.contrastIsPoor)
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result ← F'(X)
  ASSERT lighterPayload(result) OR skeletonShown(result) OR notMatchedAsPlainIngredient(result)
      OR consistentGreenBlackPalette(result) OR readableDarkModeContrast(result)
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
