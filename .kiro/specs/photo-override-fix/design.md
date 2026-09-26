# Photo Override Fix Bugfix Design

## Overview

When a user manually uploads a pantry item with a photo, and a product with the same name already exists in the database with an existing image, the new photo is silently discarded. The pantry item is created successfully, but the product continues to display the old image rather than the one the user just uploaded.

The fix is a single-condition removal in `nitro-app/server/api/pantry_item/index.post.ts`. The `else if` branch that updates an existing product's image currently guards behind `!existing.image_base64`, preventing any update when a prior image is present. Removing that guard ensures the user's uploaded photo always wins.

## Glossary

- **Bug_Condition (C)**: The set of requests where `image_base64` is provided, a product with the same `product_name` exists, and that product already has a non-null `image_base64` — the exact scenario that causes the image to be silently discarded.
- **Property (P)**: The desired outcome for bug-condition inputs — the existing product's `image_base64` is overwritten with the value from the request.
- **Preservation**: All other request patterns (new product, existing product with no image, no image in request, scan-by-ID path, daily limit enforcement) must behave identically before and after the fix.
- **handleManualUploadBranch**: The `else` block inside `index.post.ts` that runs when `body.product_id === undefined`, responsible for finding or creating a product by name and optionally updating its image.
- **existing**: The Prisma `Product` record returned by `findFirst({ where: { product_name } })`, which may or may not carry an existing `image_base64`.

## Bug Details

### Bug Condition

The bug manifests when a user submits a manual pantry-item creation request that includes a photo (`image_base64`), and the product lookup by name returns an existing record that already has `image_base64` set. The compound guard `image_base64 && !existing.image_base64` short-circuits and skips the update entirely, leaving the old image in place.

**Formal Specification:**
```
FUNCTION isBugCondition(request)
  INPUT: request = { product_name: string, image_base64: string | null, product_id?: number }
  OUTPUT: boolean

  IF request.product_id IS NOT NULL THEN
    RETURN false  -- scan path; out of scope
  END IF

  existingProduct := prisma.product.findFirst({ where: { product_name: request.product_name.trim() } })

  RETURN existingProduct != null
     AND existingProduct.image_base64 != null
     AND request.image_base64 != null
END FUNCTION
```

### Examples

- **Bug triggered**: User uploads a photo of "Oat Milk" (`image_base64 = "data:image/..."`) and a Product row for "Oat Milk" already has `image_base64 = "data:image/old..."`. Result: the old image is kept; the user's upload is discarded.
- **Bug triggered**: User re-uploads a cleaner photo of "Olive Oil" to correct a blurry prior image. The product already has an image. Result: the blurry image persists.
- **Bug NOT triggered (new product)**: User uploads a photo of "Tahini" and no product row exists yet. Result: a new product is created with the uploaded photo — works correctly today.
- **Bug NOT triggered (no prior image)**: User uploads a photo of "Soy Sauce" and the existing product has `image_base64 = null`. Result: the photo is saved — works correctly today.
- **Bug NOT triggered (no photo in request)**: User adds "Rice" with no photo. Result: no image update attempted — works correctly today.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- New product creation (no existing match) must continue to create the product and store the uploaded photo.
- Existing product with no image must continue to receive the uploaded photo when one is provided.
- Requests without a photo must continue to leave product image data untouched.
- The scan-by-ID path (`product_id` provided) must continue to bypass all name-matching and image-update logic entirely.
- The daily manual upload limit (7 per user per day) must continue to reject requests with HTTP 429 once reached.

**Scope:**
All requests that do NOT satisfy `isBugCondition` must produce behaviour identical to the unfixed code. This includes:
- Requests where `product_id` is supplied (scan path)
- Requests where `image_base64` is null or undefined
- Requests where no existing product matches the given name
- Requests where the existing product has `image_base64 = null`

## Hypothesized Root Cause

1. **Overly Conservative Guard**: The `!existing.image_base64` condition was likely added to avoid overwriting an existing image when the image was seeded or sourced from a barcode scan. The intent may have been "only fill in a missing image", but the effect is that a user who wants to correct or override their own photo cannot do so. This is the primary cause.

2. **No Ownership/Source Distinction**: The product table has no field distinguishing a user-uploaded image from a scan-sourced or seeded image. Without that distinction, any update guard applied to `existing.image_base64` will inadvertently block legitimate user overrides.

3. **Silent Discard (No Error)**: Because no error is thrown and the pantry item is still created, the user has no feedback that their photo was ignored. The bug is invisible until the item appears in the pantry without the expected image.

## Correctness Properties

Property 1: Bug Condition - Uploaded Photo Overwrites Existing Image

_For any_ request where `isBugCondition` returns true (manual upload with a photo, matching product exists and already has an image), the fixed handler SHALL update the existing product's `image_base64` to the value provided in the request before creating the pantry item.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Non-Bug-Condition Requests Are Unaffected

_For any_ request where `isBugCondition` returns false (new product, existing product without an image, no photo in request, scan-by-ID path, or daily limit exceeded), the fixed handler SHALL produce exactly the same observable outcome as the original handler, preserving all existing creation, validation, and limit-enforcement behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `nitro-app/server/api/pantry_item/index.post.ts`

**Function**: `defineEventHandler` → manual upload branch (the `else` block under `if (body.product_id !== undefined)`)

**Specific Changes**:

1. **Remove `!existing.image_base64` guard**: Change the condition from:
   ```ts
   } else if (image_base64 && !existing.image_base64) {
   ```
   to:
   ```ts
   } else if (image_base64) {
   ```
   This is the only code change required. No other files are affected.

2. **No schema changes**: The `image_base64` column already exists and is nullable; no migration is needed.

3. **No API contract changes**: Request and response shapes are unchanged.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm the bug is reproducible on the unfixed code (exploratory), then verify the fix resolves it without breaking any preservation requirements.

### Exploratory Bug Condition Checking

**Goal**: Surface a counterexample demonstrating that the unfixed handler discards the uploaded photo when a product with the same name and an existing image is present. This confirms the root cause analysis before the fix is applied.

**Test Plan**: Mock `prisma.product.findFirst` to return a product with a non-null `image_base64`. Call the handler with a request carrying a different `image_base64` value. Assert that `prisma.product.update` is called with the new image. On unfixed code this assertion will fail — `update` will not be called at all.

**Test Cases**:
1. **Existing image overwrite attempt**: `findFirst` returns `{ id: 1, image_base64: "old" }`, request has `image_base64: "new"` — assert `update` is invoked (will fail on unfixed code).
2. **Multiple contexts**: same scenario with different product names — assert consistent failure pattern.
3. **Edge case — image is empty string**: `existing.image_base64 = ""` — verify whether the guard treats this as falsy (may or may not trigger the bug depending on runtime coercion).
4. **Edge case — very large base64 string**: ensure no size-related short-circuit occurs on unfixed code.

**Expected Counterexamples**:
- `prisma.product.update` is never called when `existing.image_base64` is truthy, regardless of the incoming `image_base64` value.
- Root cause confirmed: the `!existing.image_base64` guard prevents the update branch from executing.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed handler updates `image_base64` on the existing product.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  result := handleManualUpload_fixed(request)
  ASSERT prisma.product.update WAS CALLED with { data: { image_base64: request.image_base64 } }
  ASSERT result.item.product.image_base64 == request.image_base64
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed handler produces the same result as the original handler.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT handleManualUpload_original(request) == handleManualUpload_fixed(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (varying product names, null/non-null images, product_id present or absent, different quantity/unit/date combinations).
- It catches edge cases that manual unit tests might miss.
- It provides strong guarantees that no non-bug-condition path regresses.

**Test Plan**: Observe the unfixed handler's behavior for non-bug-condition inputs, record the outcomes, then assert the fixed handler produces identical outcomes.

**Test Cases**:
1. **New product creation**: `findFirst` returns null, request has `image_base64` — assert `create` is called, `update` is not called; same behavior before and after fix.
2. **Existing product, no prior image**: `findFirst` returns `{ image_base64: null }`, request has `image_base64` — assert `update` is called; same behavior before and after fix (this path was already working).
3. **No photo in request**: request has `image_base64: undefined` — assert neither `create` nor `update` carries an image value; same behavior before and after fix.
4. **Scan path (product_id provided)**: request has `product_id: 5` — assert name-lookup and image-update logic is never reached; same behavior before and after fix.
5. **Daily limit enforced**: user has 7 manual uploads today — assert 429 is returned; same behavior before and after fix.

### Unit Tests

- Test that `prisma.product.update` is called with the new `image_base64` when an existing product already has an image (the bug scenario).
- Test that `prisma.product.update` is called with the new `image_base64` when an existing product has `image_base64 = null` (was already working; must remain working).
- Test that `prisma.product.create` is called with the uploaded photo when no existing product is found.
- Test that no image-related DB call is made when `image_base64` is absent from the request.
- Test edge cases: `image_base64` is an empty string, `product_name` has leading/trailing whitespace.

### Property-Based Tests

- Generate random `{ product_name, image_base64 }` pairs and verify that when `isBugCondition` holds, the fixed handler always calls `update` with the new image.
- Generate random non-bug-condition inputs (null images, missing products, scan-path requests) and verify the fixed and original handlers produce identical side effects.
- Generate random user histories with varying upload counts and verify the daily limit logic is unaffected by the fix.

### Integration Tests

- End-to-end: POST to `/api/pantry_item` with a photo for an existing product that has an image; confirm the returned `item.product.image_base64` matches the uploaded value.
- End-to-end: POST to `/api/pantry_item` with a photo for a brand-new product; confirm a new product is created with the correct image.
- End-to-end: POST to `/api/pantry_item` without a photo for an existing product with an image; confirm the product image is untouched.
- End-to-end: POST to `/api/pantry_item` via the scan path (`product_id`); confirm no image mutation occurs on the referenced product.
