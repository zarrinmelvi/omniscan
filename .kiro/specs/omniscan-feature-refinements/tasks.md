# Implementation Plan

- [ ] 1. Write bug condition exploration tests (selection limit + non-consumable filter)
  - **Property 1: Bug Condition** - Preference Limit Not Enforced & Non-Consumable Term Accepted
  - **CRITICAL**: Write these tests BEFORE implementing any fix — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fix once it passes after implementation
  - **GOAL**: Surface concrete counterexamples demonstrating all three client-side bug conditions
  - **Scoped PBT Approach**: Scope each property to the concrete failing cases (e.g. prefTotal = 5 with any add action; any blocklist term in free-text field)
  - **Bug Condition 1a — ProfilePage selection limit** (`isBugCondition_SelectionLimit_Profile`):
    - Set `form.customPreferences` to 5 items, call `addCustomPreference('Keto')` → assert list does NOT grow beyond 5 and `prefLimitWarning` is true
    - Set 4 custom prefs + `form.halalPref = true` (prefTotal = 5), call `addQuickPreference('Sesame-free')` → assert list unchanged and warning shown
    - Set `form.customPreferences` to 5 items, fire inline Halal quick-add path → assert `form.halalPref` remains false and warning shown
  - **Bug Condition 1b — RegisterPage selection limit** (`isBugCondition_SelectionLimit_Register`):
    - Set `selectedAllergenIds` to 5 items, call `toggleAllergen(newId)` → assert length stays 5 and `prefLimitWarning` is true
    - Set 4 allergens + `halalSelected = true`, call `toggleAllergen(newId)` → assert length stays 4 and warning shown
    - Set `selectedAllergenIds` to 5 items, fire Halal toggle → assert `halalSelected` stays false and warning shown
  - **Bug Condition 2 — Non-consumable filter** (`isBugCondition_NonConsumable`):
    - Set `customPrefDraft` to "shampoo", call `addCustomPreference()` → assert "shampoo" is NOT in `form.customPreferences` and `prefAddError` is set
    - Set `customPrefDraft` to "bleach-free" (substring match), call `addCustomPreference()` → assert blocked and error shown
    - Set `customPrefDraft` to "supplement-free" (substring match), call `addCustomPreference()` → assert blocked
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All tests FAIL — this is correct, it proves the bugs exist
  - Document all counterexamples found (e.g. "addCustomPreference with prefTotal=5 pushed 'Keto', list grew to 6")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Write bug condition exploration tests (date parsing — Refinements 3 & 4)
  - **Property 1: Bug Condition** - Alternative Date Formats Silently Discarded
  - **CRITICAL**: Write these tests BEFORE implementing any fix
  - **DO NOT attempt to fix the test or the code when they fail**
  - **GOAL**: Confirm that common alternative date formats return null with no console.warn on unfixed code
  - **Scoped PBT Approach**: Scope to concrete failing cases — each format pattern from the design table
  - **Bug Condition 3 — Silent discard with no log** (`isBugCondition_SilentDiscard`):
    - Call unfixed `normalizeToDateStringOrNull("DEC 2026")` → assert result is null AND `console.warn` was NOT called (proves silent discard)
  - **Bug Condition 4 — Parseable alternative formats discarded** (`isBugCondition_UnparsedDate`):
    - Call unfixed `normalizeToDateStringOrNull("31 DEC 2026")` → assert result is null (expected: "2026-12-31")
    - Call unfixed `normalizeToDateStringOrNull("EXP: 12/26")` → assert result is null (expected: "2026-12-01")
    - Call unfixed `normalizeToDateStringOrNull("12/2026")` → assert result is null (expected: "2026-12-01")
    - Call unfixed `normalizeToDateStringOrNull("BEST BY 15 JAN 2027")` → assert result is null (expected: "2027-01-15")
    - Call unfixed `normalizeToDateStringOrNull("2026.12.31")` → assert result is null (expected: "2026-12-31")
    - Call unfixed `normalizeToDateStringOrNull("31/12/2026")` → assert result is null (expected: "2026-12-31")
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All tests FAIL — this is correct, it proves the bugs exist
  - Document counterexamples found (e.g. "normalizeToDateStringOrNull('31 DEC 2026') returned null instead of '2026-12-31'")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.6, 1.7, 1.8_

- [ ] 3. Write preservation property tests — client-side preference behavior (BEFORE implementing fix)
  - **Property 2: Preservation** - Sub-Limit Additions and All Removals Unaffected
  - **IMPORTANT**: Follow observation-first methodology — observe UNFIXED code behavior for non-bug-condition inputs
  - **Observe on UNFIXED code (prefTotal < 5 cases)**:
    - `addCustomPreference('vegan')` with 0 prefs → adds successfully
    - `addCustomPreference('keto')` with 4 prefs → adds successfully (total becomes 5, which is allowed)
    - `handleQuickAdd('Sesame-free')` with 2 prefs → adds successfully
    - `toggleAllergen(id)` with 3 allergens selected → adds successfully
    - `toggleHalal()` with 4 allergens → sets `halalSelected = true` successfully (total = 5, allowed)
  - **Observe on UNFIXED code (removal cases)**:
    - `removeCustomPreference('vegan')` with 5 prefs → removes successfully
    - `toggleAllergen(existingId)` (deselect) with 5 allergens → removes successfully
    - Removing Halal chip with 5 total → `form.halalPref` set to false successfully
  - **Observe on UNFIXED code (duplicate guard)**:
    - `addCustomPreference('gluten-free')` when "gluten-free" already exists → NOT added (duplicate guard active)
  - **Observe on UNFIXED code (quick-add / grid paths)**:
    - Quick-add chip selections → bypass `isNonConsumable` and add normally
  - Write property-based tests capturing these observed behaviors across the input domain:
    - For any prefTotal in [0..4], any add action succeeds
    - For any prefTotal in [0..5], any remove action succeeds
    - For any legitimate food term not in blocklist entered via free-text, the term is added (subject only to duplicate and limit checks)
    - Quick-add and allergen-grid paths are never subject to non-consumable filtering
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - _Requirements: 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 4. Write preservation property tests — date parsing (BEFORE implementing fix)
  - **Property 2: Preservation** - Valid YYYY-MM-DD and Null/Empty Inputs Unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe UNFIXED code behavior for non-bug-condition inputs
  - **Observe on UNFIXED code**:
    - `normalizeToDateStringOrNull("2026-12-31")` → returns "2026-12-31", no console.warn
    - `normalizeToDateStringOrNull("2026-01-01")` → returns "2026-01-01", no console.warn
    - `normalizeToDateStringOrNull(null)` → returns null, no console.warn
    - `normalizeToDateStringOrNull("")` → returns null, no console.warn
    - `normalizeToDateStringOrNull("   ")` → returns null, no console.warn
    - `normalizeToDateStringOrNull("2026-13-01")` → returns null (invalid month — round-trip fails), no console.warn
  - Write property-based tests capturing these observed behaviors:
    - For any valid YYYY-MM-DD string that passes round-trip, `normalizeToDateStringOrNull` returns it unchanged with no warn
    - For any null or empty/whitespace-only input, returns null silently
    - Property: for any `(y, m, d)` triple where `isValidYMD(y, m, d)` is non-null, parsing the returned string returns the same string (round-trip identity)
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - _Requirements: 3.8, 3.9, 3.10, 3.11, 3.12_

- [ ] 5. Implement Refinement 1 — Selection limit in ProfilePage.vue

  - [ ] 5.1 Add PREF_MAX constant, prefLimitWarning ref, and prefTotal computed
    - Add `const PREF_MAX = 5` in `<script setup>`
    - Add `const prefLimitWarning = ref(false)`
    - Add `const prefTotal = computed(() => form.customPreferences.length + (form.halalPref ? 1 : 0))`
    - _Bug_Condition: isBugCondition_SelectionLimit_Profile(state, action) where state.customPreferences.length + (state.halalPref ? 1 : 0) >= PREF_MAX_
    - _Requirements: 2.1_

  - [ ] 5.2 Add handleQuickAdd(suggestion) method replacing inline template handler
    - Add `function handleQuickAdd(suggestion: string)` that checks `prefTotal.value >= PREF_MAX` before acting
    - If at limit: set `prefLimitWarning.value = true` and return
    - If `suggestion === 'Halal'`: set `form.halalPref = true`; else call `addQuickPreference(suggestion)`
    - _Expected_Behavior: addition is blocked when prefTotal >= PREF_MAX; inline notice shown_
    - _Requirements: 2.1_

  - [ ] 5.3 Update addCustomPreference() with limit check (after non-consumable check)
    - After the `isNonConsumable` guard (Refinement 2), add: if `prefTotal.value >= PREF_MAX` → set `prefLimitWarning.value = true` and return
    - On successful add, clear `prefAddError.value = null`
    - _Bug_Condition: isBugCondition_SelectionLimit_Profile — add branch_
    - _Requirements: 2.1_

  - [ ] 5.4 Add removeHalalPref() method and update removeCustomPreference()
    - Add `function removeHalalPref()` that sets `form.halalPref = false` and `prefLimitWarning.value = false`
    - Update `removeCustomPreference(pref)` to also set `prefLimitWarning.value = false` after filtering
    - _Preservation: removals always succeed and clear the warning — Requirements 2.2_
    - _Requirements: 2.2_

  - [ ] 5.5 Reset prefLimitWarning and prefAddError in openEditModal()
    - Add `prefLimitWarning.value = false` and `prefAddError.value = null` inside `openEditModal()` before opening the modal
    - _Preservation: stale error state from previous session is cleared — Requirements 3.3_
    - _Requirements: 3.3_

  - [ ] 5.6 Update template — replace inline quick-add @click, add warning paragraph, update Halal chip remove
    - Replace `@click="suggestion === 'Halal' ? (form.halalPref = true) : addQuickPreference(suggestion)"` with `@click="handleQuickAdd(suggestion)"`
    - Add `<p v-if="prefLimitWarning" class="pref-limit-warning">You can select up to 5 dietary preferences.</p>` below the quick-add chip row
    - Replace inline `@click="form.halalPref = false"` on the Halal chip remove icon with `@click="removeHalalPref()"`
    - _Expected_Behavior: inline notice displayed when prefTotal >= PREF_MAX_
    - _Requirements: 2.1, 2.2_

  - [ ] 5.7 Add .pref-limit-warning style rule
    - Add `.custom-edit-modal .pref-limit-warning { color: #d97706; font-size: 0.78rem; margin: 4px 0 8px; }` to the unscoped `<style>` block
    - _Requirements: 2.1_

- [ ] 6. Implement Refinement 2 — Non-consumable filter in ProfilePage.vue

  - [ ] 6.1 Add NON_CONSUMABLE_TERMS constant and prefAddError ref
    - Add `const NON_CONSUMABLE_TERMS: string[]` covering ~30 terms: shampoo, lotion, soap, perfume, conditioner, moisturiser, moisturizer, lipstick, mascara, foundation, serum, toner, sunscreen, bleach, detergent, disinfectant, polish, cleaner, wax, plastic, metal, fabric, electronics, medication, drug, pill, tablet, capsule, supplement
    - Add `const prefAddError = ref<string | null>(null)`
    - _Bug_Condition: isBugCondition_NonConsumable(input, 'free_text') where input.toLowerCase() includes any term from NON_CONSUMABLE_TERMS_
    - _Requirements: 2.5_

  - [ ] 6.2 Add isNonConsumable(value) helper function
    - Add `function isNonConsumable(value: string): boolean` that checks `value.toLowerCase()` against every term via `.some(term => lower.includes(term))`
    - _Expected_Behavior: returns true for any substring match against NON_CONSUMABLE_TERMS_
    - _Requirements: 2.5_

  - [ ] 6.3 Add non-consumable guard at the top of addCustomPreference()
    - Call `isNonConsumable(value)` as the first validation step (before limit check)
    - On match: set `prefAddError.value = 'Please enter a food-related dietary preference.'` and return
    - _Bug_Condition: blocked before limit check so both errors remain independent_
    - _Expected_Behavior: prefAddError set; term NOT added to form.customPreferences_
    - _Preservation: legitimate food terms ("gluten-free", "vegan") pass through unaffected — Requirements 2.6, 3.7_
    - _Requirements: 2.5, 2.6, 3.7_

  - [ ] 6.4 Update template — add pref-add-error paragraph and @input clear on customPrefDraft input
    - Add `<p v-if="prefAddError" class="pref-add-error">{{ prefAddError }}</p>` directly below the `custom-pref-input-row` div
    - Add `@input="prefAddError = null"` to the `customPrefDraft` input element
    - _Expected_Behavior: error message visible immediately on failed add; clears as user types_
    - _Requirements: 2.5_

  - [ ] 6.5 Add .pref-add-error style rule
    - Add `.custom-edit-modal .pref-add-error { color: #b91c1c; font-size: 0.78rem; margin: -10px 0 8px; }` to the unscoped `<style>` block
    - _Requirements: 2.5_

- [ ] 7. Implement Refinement 3 — Selection limit in RegisterPage.vue

  - [ ] 7.1 Add PREF_MAX constant, prefLimitWarning ref, and prefTotal computed
    - Add `const PREF_MAX = 5`
    - Add `const prefLimitWarning = ref(false)`
    - Add `const prefTotal = computed(() => selectedAllergenIds.value.length + (halalSelected.value ? 1 : 0))`
    - _Bug_Condition: isBugCondition_SelectionLimit_Register(state, action) where total >= PREF_MAX_
    - _Requirements: 2.3_

  - [ ] 7.2 Add toggleHalal() method replacing inline Halal card @click
    - Add `function toggleHalal(): void`
    - On toggle-on: if `prefTotal.value >= PREF_MAX` → set `prefLimitWarning.value = true` and return; else set `halalSelected.value = true`
    - On toggle-off: set `halalSelected.value = false` and `prefLimitWarning.value = false`
    - _Bug_Condition: halalSelected set to true when total is already at PREF_MAX_
    - _Expected_Behavior: blocked with warning when at limit; deselection always clears warning_
    - _Requirements: 2.3, 2.4_

  - [ ] 7.3 Update toggleAllergen() with limit check on add branch, clear warning on remove branch
    - In the add (else) branch: if `prefTotal.value >= PREF_MAX` → set `prefLimitWarning.value = true` and return
    - In the remove (if) branch: add `prefLimitWarning.value = false` after filtering
    - _Bug_Condition: isBugCondition_SelectionLimit_Register — allergen add branch_
    - _Preservation: deselection always succeeds; sub-limit additions proceed normally — Requirements 2.4, 3.2_
    - _Requirements: 2.3, 2.4_

  - [ ] 7.4 Update template — replace Halal card @click with toggleHalal(), add warning paragraph
    - Replace `@click="halalSelected = !halalSelected"` with `@click="toggleHalal()"`
    - Add `<p v-if="prefLimitWarning" class="pref-limit-warning">You can select up to 5 dietary preferences.</p>` below the `.pref-grid` div (before the `prefsError` block)
    - _Expected_Behavior: inline notice shown below grid when at limit_
    - _Requirements: 2.3_

  - [ ] 7.5 Add .pref-limit-warning style rule
    - Add `.pref-limit-warning { color: #d97706; font-size: 0.78rem; margin: -12px 0 12px; }` inside `<style scoped>`
    - _Requirements: 2.3_

- [ ] 8. Implement Refinements 3 & 4 — Date parsing in nitro-app/server/api/scan/index.post.ts

  - [ ] 8.1 Add MONTH_NAMES constant
    - Add `const MONTH_NAMES: Record<string, number>` mapping three-letter lowercase month abbreviations (jan–dec) to their numeric values (1–12)
    - Insert immediately before `normalizeToDateStringOrNull`
    - _Requirements: 2.10_

  - [ ] 8.2 Add isValidYMD(y, m, d) helper function
    - Add `function isValidYMD(y: number, m: number, d: number): string | null`
    - Pad values, construct `YYYY-MM-DD` candidate, validate via round-trip: `new Date(\`\${candidate}T00:00:00Z\`)` must not be NaN and `.toISOString().slice(0, 10)` must equal candidate
    - Return candidate string on success, null on failure (gates impossible dates like Feb 31)
    - Insert immediately before `normalizeToDateStringOrNull`
    - _Preservation: round-trip check still gates all output — Requirements 2.11, 3.11_
    - _Requirements: 2.11, 3.11_

  - [ ] 8.3 Add tryParseRawDateString(raw) function with 8 pattern branches
    - Add `function tryParseRawDateString(raw: string): string | null` immediately before `normalizeToDateStringOrNull`
    - Normalise whitespace: `raw.trim().replace(/\s+/g, ' ')`
    - Branch 1 — YYYY-MM-DD pass-through: match `/^(\d{4})-(\d{2})-(\d{2})$/`, return `isValidYMD`
    - Branch 2 — Strip EXP / BEST BY prefix: match `/^(?:exp:?\s*|best\s*by:?\s*)/i`, strip and recurse once
    - Branch 3 — YYYY.MM.DD: match `/^(\d{4})\.(\d{2})\.(\d{2})$/`, return `isValidYMD`
    - Branch 4 — DD MMM YYYY: match `/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/`, look up `MONTH_NAMES`, return `isValidYMD(year, month, day)`
    - Branch 5 — DD/MM/YYYY: match `/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/` when first ≤ 31 and second ≤ 12, return `isValidYMD(year, month, day)`
    - Branch 6 — MM/DD/YYYY: same regex when second > 12 and first ≤ 12 (unambiguous day), return `isValidYMD(year, month, day)`
    - Branch 7 — MM/YYYY: match `/^(\d{1,2})\/(\d{4})$/`, day = 1, return `isValidYMD`
    - Branch 8 — MM/YY: match `/^(\d{1,2})\/(\d{2})$/`, day = 1, year = 2000 + YY, return `isValidYMD`
    - Return null if no branch matches
    - _Bug_Condition: isBugCondition_UnparsedDate — value not in YYYY-MM-DD but tryParseRawDateString returns non-null_
    - _Expected_Behavior: returns YYYY-MM-DD string for all 8 patterns listed in design table_
    - _Requirements: 2.9, 2.10, 2.11, 2.12_

  - [ ] 8.4 Update normalizeToDateStringOrNull() to call tryParseRawDateString before logging/returning null
    - Restructure the function body:
      1. `if (typeof value !== 'string') return null`
      2. `const trimmed = value.trim(); if (!trimmed) return null`
      3. Fast path: if `/^\d{4}-\d{2}-\d{2}$/.test(trimmed)` → round-trip check → return trimmed (unchanged)
      4. Recovery: `const recovered = tryParseRawDateString(trimmed); if (recovered) return recovered`
      5. Fallback: `console.warn('[scan] expiration_date not in YYYY-MM-DD — raw AI value:', trimmed); return null`
    - The `console.warn` fires ONLY when `tryParseRawDateString` also returns null (step 5)
    - Successfully recovered dates return from step 4 with no warn (Refinement 3 requirement 2.13)
    - _Bug_Condition: isBugCondition_SilentDiscard — non-empty non-YYYY-MM-DD string AND tryParse returns null → warn fires_
    - _Expected_Behavior: recovered dates returned silently; unrecoverable strings logged and discarded_
    - _Preservation: valid YYYY-MM-DD fast path unchanged; null/empty still silent — Requirements 3.8, 3.9, 3.10, 3.12_
    - _Requirements: 2.7, 2.8, 2.9, 2.12, 2.13, 3.8, 3.9, 3.10, 3.12_

- [ ] 9. Verify bug condition exploration tests now pass (after all fixes applied)

  - [ ] 9.1 Re-run Property 1 tests from task 1 (client-side selection limit + non-consumable filter)
    - **Property 1: Expected Behavior** - Selection Limit Enforced & Non-Consumable Blocked
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - Tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the selection limit and non-consumable filter fixes are correct
    - **EXPECTED OUTCOME**: All tests from task 1 PASS
    - _Requirements: 2.1, 2.3, 2.5_

  - [ ] 9.2 Re-run Property 1 tests from task 2 (date parsing bug conditions)
    - **Property 1: Expected Behavior** - Alternative Formats Recovered & Logging Fires
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Tests from task 2 encode the expected behavior
    - When these tests pass, it confirms `tryParseRawDateString` and the logging fix are correct
    - **EXPECTED OUTCOME**: All tests from task 2 PASS (recovered strings returned; warn fires only for unparseable)
    - _Requirements: 2.7, 2.9, 2.10, 2.13_

- [ ] 10. Verify preservation tests still pass after all fixes

  - [ ] 10.1 Re-run Property 2 tests from task 3 (client-side preference preservation)
    - **Property 2: Preservation** - Sub-Limit Additions and Removals Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 3 — do NOT write new tests
    - **EXPECTED OUTCOME**: All tests from task 3 PASS (no regressions in preference handling)
    - _Requirements: 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 10.2 Re-run Property 2 tests from task 4 (date parsing preservation)
    - **Property 2: Preservation** - Valid YYYY-MM-DD and Null/Empty Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 4 — do NOT write new tests
    - **EXPECTED OUTCOME**: All tests from task 4 PASS (no regressions in date normalization)
    - _Requirements: 3.8, 3.9, 3.10, 3.11, 3.12_

- [ ] 11. Checkpoint — Ensure all tests pass
  - Run the full test suite for both the frontend (ProfilePage, RegisterPage) and the Nitro server (scan endpoint)
  - All Property 1 exploration tests from tasks 1 and 2 must PASS (bug conditions fixed)
  - All Property 2 preservation tests from tasks 3 and 4 must PASS (no regressions)
  - Confirm `console.warn` fires only for unrecoverable non-YYYY-MM-DD strings and not for successfully recovered dates
  - Confirm `prefLimitWarning` is shown when `prefTotal >= 5` and cleared on any removal in both ProfilePage and RegisterPage
  - Confirm `prefAddError` is shown for non-consumable free-text input and clears on `@input` in ProfilePage
  - Ask the user if any questions arise before marking complete
