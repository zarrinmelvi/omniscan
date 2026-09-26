# Bugfix Requirements Document

## Introduction

When a user manually uploads a photo for a product whose name already exists in the database, the new photo is silently discarded. The pantry item is created successfully but continues to display the old cached image instead of the user's freshly uploaded one. This affects the manual upload path in the pantry item creation endpoint — specifically the branch that resolves a product by name rather than by a scanned product ID.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user manually uploads a pantry item with a photo AND a product with the same name already exists in the database AND that existing product already has an image stored THEN the system silently discards the user's uploaded photo and retains the old image.

1.2 WHEN a user manually uploads a pantry item with a photo AND a product with the same name already exists in the database AND that existing product already has an image stored THEN the system creates the pantry item without reflecting the user's intended image.

### Expected Behavior (Correct)

2.1 WHEN a user manually uploads a pantry item with a photo AND a product with the same name already exists in the database AND that existing product already has an image stored THEN the system SHALL overwrite the existing product's image with the user's newly uploaded photo.

2.2 WHEN a user manually uploads a pantry item with a photo AND a product with the same name already exists in the database THEN the system SHALL persist the user's uploaded photo as the product's current image regardless of whether a prior image was present.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user manually uploads a pantry item with a photo AND no product with that name exists in the database THEN the system SHALL CONTINUE TO create a new product record and store the uploaded photo on it.

3.2 WHEN a user manually uploads a pantry item with a photo AND a product with the same name already exists in the database AND that existing product has no image THEN the system SHALL CONTINUE TO update the existing product record with the uploaded photo.

3.3 WHEN a user manually uploads a pantry item WITHOUT a photo THEN the system SHALL CONTINUE TO create the pantry item without modifying any image on the matched or created product.

3.4 WHEN a user adds a pantry item via a scanned product ID (product_id is provided) THEN the system SHALL CONTINUE TO look up the product by ID without touching any image data.

3.5 WHEN the daily manual upload limit of 7 has been reached for a user THEN the system SHALL CONTINUE TO reject further manual uploads with a 429 status.
