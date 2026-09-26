# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Uploaded Photo Discarded When Product Already Has Image
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For this deterministic bug, scope the property to the concrete failing case: a product that already has `image_base64` set, and a new upload request that provides a different `image_base64` value
  - Bug Condition (C(X)): `existing.image_base64 !== null && request.image_base64 !== null && request.image_base64 !== undefined`
  - Expected Behavior (P(result)): after the POST request, `product.image_base64` equals the newly uploaded value from the request body
  - Test setup: seed a product in the DB with `product_name = "TestProduct"` and a non-null `image_base64 = "old-photo-data"`, then POST to `/api/pantry_item` with `{ product_name: "TestProduct", image_base64: "new-photo-data", ... }`
  - Assert: the product row in the DB now has `image_base64 = "new-photo-data"`
  - Run test on UNFIXED code (`else if (image_base64 && !existing.image_base64)` branch)
  - **EXPECTED OUTCOME**: Test FAILS — the product still holds `"old-photo-data"` (bug confirmed)
  - Document counterexample: `POST { product_name: "TestProduct", image_base64: "new-photo-data" }` → product.image_base64 remains `"old-photo-data"` instead of updating
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Photo Is Not Overwritten When Request Has No Image
  - **IMPORTANT**: Follow observation-first methodology
  - Non-bug condition (¬C(X)): cases where `request.image_base64` is `null` or `undefined`
  - Observe on UNFIXED code: POST with no `image_base64` → existing product photo is untouched
  - Observe on UNFIXED code: POST for a brand-new product with `image_base64` → product is created with that image
  - Observe on UNFIXED code: POST for a brand-new product with no `image_base64` → product is created with `image_base64 = null`
  - Write property-based tests covering these patterns:
    - For all products with an existing `image_base64`, a POST request omitting `image_base64` leaves the product photo unchanged
    - A new product created with an `image_base64` value stores that value correctly
    - A new product created without an `image_base64` stores `null`
  - Verify all tests PASS on UNFIXED code
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. Fix: always update product image when user uploads a new photo

  - [ ] 3.1 Implement the fix in `nitro-app/server/api/pantry_item/index.post.ts`
    - Locate the `else if` branch that conditionally updates the product image (~line 116)
    - Change `} else if (image_base64 && !existing.image_base64) {` to `} else if (image_base64) {`
    - Remove the `&& !existing.image_base64` guard so any non-null upload overwrites the stored photo
    - _Bug_Condition: `existing.image_base64 !== null && request.image_base64` is truthy_
    - _Expected_Behavior: `prisma.product.update({ data: { image_base64 } })` is called whenever `image_base64` is present in the request, regardless of the current DB value_
    - _Preservation: when `image_base64` is absent from the request, no update to the product image is performed_
    - _Requirements: 1.1, 2.1, 2.2, 2.3_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Uploaded Photo Overwrites Existing Product Image
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the new photo is correctly persisted
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 1.1_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Upload Requests Do Not Alter Product Photos
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
