# Bugfix Requirements Document

## Introduction

The application has two flows for adding items to the pantry: the **Upload flow** (`PhotoPantryUploadModal.vue`) and the **Live Scan flow** (`ScanResultModal.vue`). When a scanned or uploaded product contains allergens that match the user's dietary profile, users should be warned and required to explicitly confirm before the item is added to their pantry.

The upload flow already presents an `alertController` confirmation dialog when matched allergens are detected. The live scan flow is missing this guard entirely — it adds allergen-matched items to the pantry immediately, without any user confirmation. This discrepancy means users relying on the scan flow receive no allergen safety warning.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user submits a scanned product via `ScanResultModal.vue` AND `personalAllergenAlerts` contains one or more matched allergens THEN the system adds the item to the pantry immediately without presenting any allergen warning or confirmation prompt

1.2 WHEN a user submits a scanned product via `ScanResultModal.vue` AND matched allergens are present THEN the system does not give the user the opportunity to cancel the add action due to allergen concerns

### Expected Behavior (Correct)

2.1 WHEN a user submits a scanned product via `ScanResultModal.vue` AND `personalAllergenAlerts` contains one or more matched allergens THEN the system SHALL present an allergen warning alert (header: "Allergen Warning") listing the matched allergens and offer "Cancel" and "Add Anyway" actions before adding the item to the pantry

2.2 WHEN a user submits a scanned product via `ScanResultModal.vue` AND the allergen warning is presented AND the user selects "Cancel" THEN the system SHALL abort the add-to-pantry action and leave the pantry unchanged

2.3 WHEN a user submits a scanned product via `ScanResultModal.vue` AND the allergen warning is presented AND the user selects "Add Anyway" THEN the system SHALL proceed to add the item to the pantry (continuing with any remaining guards such as the expiry check)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user submits a scanned product via `ScanResultModal.vue` AND `personalAllergenAlerts` is empty THEN the system SHALL CONTINUE TO add the item to the pantry without presenting an allergen confirmation prompt

3.2 WHEN a user submits a product via the upload flow (`PhotoPantryUploadModal.vue`) AND matched allergens are present THEN the system SHALL CONTINUE TO present the allergen warning alert exactly as it currently does

3.3 WHEN a user submits a product via the upload flow (`PhotoPantryUploadModal.vue`) AND `matchedUserAllergens` is empty THEN the system SHALL CONTINUE TO add the item without an allergen prompt

3.4 WHEN a user submits a scanned product with no allergen match AND the item is expired THEN the system SHALL CONTINUE TO present the expiry confirmation guard as it currently does

3.5 WHEN a user submits a scanned product with matched allergens AND the user confirms "Add Anyway" AND the item is also expired THEN the system SHALL CONTINUE TO subsequently present the expiry confirmation guard before adding the item
