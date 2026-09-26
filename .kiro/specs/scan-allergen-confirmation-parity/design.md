# Scan Allergen Confirmation Parity Bugfix Design

## Overview

The Live Scan flow (`ScanResultModal.vue`) is missing an allergen confirmation guard in its `submitAddToPantry()` function. When a scanned product contains allergens matching the user's dietary profile, the item is added to the pantry immediately — no warning, no chance to cancel. The Upload flow (`PhotoPantryUploadModal.vue`) already handles this correctly using Ionic's `alertController`.

The fix is a single-file change: add `alertController` to the `@ionic/vue` import in `ScanResultModal.vue` and insert the allergen guard block at the top of `submitAddToPantry()`, before the existing expiry guard. This mirrors the upload flow's pattern exactly and closes the parity gap.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a user clicks "Add to Pantry" in `ScanResultModal` while `personalAllergenAlerts` contains one or more matched allergen names
- **Property (P)**: The desired behavior when the bug condition holds — an `alertController` dialog must be presented and the user must explicitly confirm before the item is added to the pantry
- **Preservation**: All behaviors unrelated to the allergen guard that must remain unchanged — including the no-allergen fast path, the expiry guard, the upload flow behavior, and all other modal interactions
- **`submitAddToPantry`**: The async function in `omniscan-ui/src/components/ScanResultModal.vue` that validates the form and calls `POST /api/pantry_item`
- **`personalAllergenAlerts`**: A computed ref in `ScanResultModal.vue` derived from `props.data?.matched_user_allergens` — an array of allergen name strings returned by the backend scan endpoint
- **`matchedUserAllergens`**: The equivalent computed ref in `PhotoPantryUploadModal.vue` — same semantic meaning, different variable name
- **`alertController`**: Ionic's programmatic alert API, already used in `PhotoPantryUploadModal.vue` for the allergen guard

## Bug Details

### Bug Condition

The bug manifests when a user clicks "Add to Pantry" in `ScanResultModal.vue` and the scanned product matches one or more of the user's registered allergens. The `submitAddToPantry()` function proceeds directly to the expiry check and then to the API call, bypassing any allergen confirmation step that the upload flow would have shown.

**Formal Specification:**
```
FUNCTION isBugCondition(submitEvent)
  INPUT: submitEvent = user clicking "Add to Pantry" in ScanResultModal
  OUTPUT: boolean

  RETURN personalAllergenAlerts.value.length > 0
         AND allergenConfirmationAlertNotShown
END FUNCTION
```

### Examples

- **Example 1 — Bug manifests**: User scans a product containing peanuts. User has "Peanuts" in their allergen profile. `personalAllergenAlerts` = `['Peanuts']`. User clicks "Add to Pantry". Expected: allergen warning alert appears. Actual: item is added to pantry immediately with no prompt.
- **Example 2 — Bug manifests (multiple allergens)**: User scans a product containing milk and eggs. User has both in their profile. `personalAllergenAlerts` = `['Milk', 'Eggs']`. User clicks "Add to Pantry". Expected: alert lists both allergens. Actual: item added silently.
- **Example 3 — Bug manifests, user would have cancelled**: User with a severe nut allergy scans a product by mistake. Would have cancelled on seeing the alert. Actual: item is already in pantry before they can react.
- **Example 4 — No bug (no allergen match)**: `personalAllergenAlerts` = `[]`. User clicks "Add to Pantry". Expected: no alert, proceed normally. Actual: proceeds normally. ✓ (this is already correct)
- **Example 5 — No bug (expiry guard)**: No allergen match, but item is expired. Expected: expiry error shown. Actual: expiry error shown. ✓ (this is already correct)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When `personalAllergenAlerts` is empty, "Add to Pantry" must proceed without any allergen prompt — same as before the fix
- The expiry guard (`const today = new Date()` block) must continue to run after a confirmed allergen bypass — the allergen check gates entry into the expiry check, not around it
- The upload flow (`PhotoPantryUploadModal.vue`) must be completely unmodified — it already has the correct allergen guard
- All other `ScanResultModal.vue` interactions — close button, form validation, storage location, date inputs, quantity/unit — must be unaffected
- `POST /api/pantry_item` behavior is unchanged; no backend modifications are made

**Scope:**
All inputs where `personalAllergenAlerts.value.length === 0` should be completely unaffected by this fix. This includes:
- Any scan result with no allergen matches
- Mouse clicks on non-submit controls (close button, storage buttons, date fields)
- The upload flow in its entirety
- Any non-submit keyboard or touch interactions within the modal

## Hypothesized Root Cause

Based on the bug description and the code, the cause is straightforward — it is a missing feature, not a regression:

1. **Guard was never implemented in the scan flow**: `submitAddToPantry()` in `ScanResultModal.vue` was written without an allergen guard. The `personalAllergenAlerts` computed ref exists and drives the visible warning banner in the template, but its value is never consulted before submission.

2. **`alertController` is absent from the import**: The `@ionic/vue` import line in `ScanResultModal.vue` does not include `alertController`, confirming the guard was never wired up.

3. **The upload flow was developed separately**: `PhotoPantryUploadModal.vue` was likely written or updated at a different time, picking up the allergen guard that the scan modal missed. There is no shared submission utility that would have propagated the guard automatically.

4. **No integration test bridged the gap**: Without a cross-flow test covering both submission paths, the missing guard went undetected.

## Correctness Properties

Property 1: Bug Condition - Allergen Guard Fires Before Pantry Add

_For any_ submit event in `ScanResultModal` where `personalAllergenAlerts.value.length > 0` (isBugCondition returns true), the fixed `submitAddToPantry` function SHALL present an `alertController` dialog with header "Allergen Warning", listing the matched allergens, and SHALL NOT add the item to the pantry until the user explicitly selects "Add Anyway". If the user selects "Cancel", the function SHALL return without adding the item.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - No-Allergen Fast Path Unchanged

_For any_ submit event in `ScanResultModal` where `personalAllergenAlerts.value.length === 0` (isBugCondition returns false), the fixed `submitAddToPantry` function SHALL produce exactly the same behavior as the original function — no allergen dialog, same execution path through the expiry guard and API call.

**Validates: Requirements 3.1, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `omniscan-ui/src/components/ScanResultModal.vue`

**Function**: `submitAddToPantry()`

**Specific Changes**:

1. **Add `alertController` to the `@ionic/vue` import**:
   - Current: `import { IonModal, IonAlert, IonContent, IonIcon, IonButton, IonSpinner } from '@ionic/vue'`
   - After: `import { IonModal, IonAlert, IonContent, IonIcon, IonButton, IonSpinner, alertController } from '@ionic/vue'`

2. **Insert allergen guard at the top of `submitAddToPantry()`**, immediately after the `submitError.value = ''` reset line and BEFORE the `const today = new Date()` expiry guard:
   ```ts
   // Allergen guardrail — mirrors PhotoPantryUploadModal.vue behavior
   if (personalAllergenAlerts.value.length > 0) {
     const allergenAlert = await alertController.create({
       header: 'Allergen Warning',
       message: `This item contains allergens matching your dietary profile (${personalAllergenAlerts.value.join(', ')}). Are you sure you want to add it to your pantry?`,
       buttons: [
         { text: 'Cancel', role: 'cancel' },
         { text: 'Add Anyway', role: 'confirm' },
       ],
     })
     await allergenAlert.present()
     const { role } = await allergenAlert.onDidDismiss()
     if (role !== 'confirm') return
   }
   ```

3. **Guard ordering preserved**: Allergen guard runs first → if confirmed, expiry guard runs second → if passed, API call runs. This ordering is intentional and matches requirement 3.5.

4. **No other files touched**: `PhotoPantryUploadModal.vue`, backend routes, and all other components are unchanged.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that mount `ScanResultModal.vue` with `data.matched_user_allergens` set to a non-empty array, simulate a "Add to Pantry" button click, and assert that an `alertController` dialog was presented. Run these tests on the UNFIXED code to observe that no alert is shown — confirming the root cause.

**Test Cases**:
1. **Single Allergen Test**: Mount modal with `matched_user_allergens: ['Peanuts']`, fill valid form, click "Add to Pantry" — assert `alertController.create` was called (will fail on unfixed code)
2. **Multiple Allergens Test**: Mount modal with `matched_user_allergens: ['Milk', 'Eggs']`, submit — assert alert message includes both allergen names (will fail on unfixed code)
3. **Cancel Path Test**: Mount modal with allergens, submit, simulate "Cancel" on the alert — assert `POST /api/pantry_item` was NOT called (will fail on unfixed code because alert never appears)
4. **Confirm Path Test**: Mount modal with allergens, submit, simulate "Add Anyway" — assert `POST /api/pantry_item` WAS called (will fail on unfixed code because alert never appears)

**Expected Counterexamples**:
- `alertController.create` is never called on the unfixed code path — the function skips straight to the expiry check
- The API call proceeds immediately without any user confirmation when allergens are present

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL submitEvent WHERE isBugCondition(submitEvent) DO
  result := submitAddToPantry_fixed(submitEvent)
  ASSERT allergenAlertPresented
  IF user role = 'confirm' → ASSERT POST /api/pantry_item called
  IF user role = 'cancel'  → ASSERT POST /api/pantry_item NOT called
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL submitEvent WHERE NOT isBugCondition(submitEvent) DO
  ASSERT submitAddToPantry_original(submitEvent) = submitAddToPantry_fixed(submitEvent)
  // no allergen alert presented, same execution path
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe on UNFIXED code that the no-allergen path proceeds directly to the API call, then write property-based tests verifying that path is identical after the fix.

**Test Cases**:
1. **Empty Allergen Array Preservation**: Verify that with `matched_user_allergens: []`, the fixed function proceeds directly to the expiry check and API call with no dialog — same as original
2. **Expiry Guard Preservation**: Verify that with no allergen match and an expired date, the expiry error still appears as before the fix
3. **Allergen-Confirmed Then Expiry**: Verify that after confirming the allergen alert, an expired item still triggers the expiry guard (requirement 3.5)
4. **Upload Flow Unaffected**: Verify `PhotoPantryUploadModal.vue` is unchanged and its allergen guard still fires independently

### Unit Tests

- Test `submitAddToPantry` with `personalAllergenAlerts` non-empty: assert alert is created and shown before any API call
- Test cancel path: mock `alertController` returning `role: 'cancel'`, assert API is not called
- Test confirm path: mock `alertController` returning `role: 'confirm'`, assert execution continues to expiry check then API call
- Test empty allergen array: assert no alert created, API called directly

### Property-Based Tests

- Generate random non-empty allergen arrays and verify the alert message always lists all allergens joined by `', '`
- Generate random combinations of (allergen count ≥ 1, form valid) and verify alert is always shown before API call
- Generate random form states where allergens are empty and verify the alert is never triggered across all valid form configurations

### Integration Tests

- Full scan flow: scan → allergen match present → submit → cancel alert → verify pantry unchanged
- Full scan flow: scan → allergen match present → submit → confirm alert → no expiry issue → verify pantry updated
- Full scan flow: scan → allergen match present → submit → confirm alert → item expired → verify expiry error shown, pantry unchanged
- Upload flow regression: allergen match in upload flow → verify alert still appears correctly, confirming no cross-component regression
