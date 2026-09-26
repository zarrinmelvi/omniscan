# Implementation Plan

---

## Bug 1 — RecipeSuggestions.vue: Stale `madeCount` State

**Bug Condition**: `madeCount` is a computed property that derives its value by
re-scanning `recipes.value` after every `fetchSuggestions()` call. Because
`fetchSuggestions()` is async and re-fetches from the network, the badge count
briefly disappears or shows the wrong value during the loading phase after
`makeRecipe` / `unmakeRecipe`. The intermediate state — where `recipes.value`
has been cleared (`isLoading = true`) but the response has not yet arrived —
causes the badge to render `0` between the action and the refresh.

**Expected Behavior**: A separate `madeTotal` ref tracks the running count and
is updated synchronously before the async fetch, so the badge never flickers to
`0` mid-flight.

**Preservation Requirement**: All tab transitions and initial load must still
derive the correct `madeCount` from the fetched data. The `all` and `made` tab
endpoints return data whose length / `.made` flags are the source of truth;
`madeTotal` is seeded from them on every successful fetch.

---

## Bug 2 — dark-mode.css: Active Toggle Button Text Invisible

**Bug Condition**: `.toggle-btn--active` and `.toggle-btn--archived-active`
elements inherit a dark text color when `html.ion-palette-dark` is applied,
making their labels illegible against the dark active-state background.

**Expected Behavior**: Active toggle buttons should display white (`#ffffff`)
text in dark mode.

---

## Bug 3 — dark-mode.css: Notification Header Title Invisible

**Bug Condition**: `.notif-header-title` is not covered by any dark-mode
override, so it retains its light-mode text colour when `html.ion-palette-dark`
is active, making the notification page header title invisible or low-contrast.

**Expected Behavior**: `.notif-header-title` should use `var(--dm-text-primary)`
in dark mode.

---

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Stale madeCount During Async Fetch
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior; it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples where the badge count incorrectly reads `0` during an in-flight fetch
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — call `makeRecipe` on an item with `made=false`, then immediately sample `madeCount.value` before the async fetch resolves; assert it equals the pre-call value + 1
  - Bug Condition (isBugCondition): `recipes.value` is cleared by `isLoading = true` before the new fetch resolves and `madeTotal` does not yet exist; therefore `madeCount` returns `0` mid-flight
  - Expected Behavior (expectedBehavior): `madeCount.value` remains `>= 1` at every observable moment after `makeRecipe` completes its optimistic update and before `fetchSuggestions` resolves
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (proves the bug — badge drops to 0)
  - Document counterexamples found (e.g., "madeCount observed as 0 immediately after makeRecipe call")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Correct madeCount After Full Fetch Cycle
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: after `fetchSuggestions()` resolves on the `all` tab with N recipes where M have `made=true`, `madeCount.value === M`
  - Observe: after `fetchSuggestions()` resolves on the `made` tab with K recipes, `madeCount.value === K`
  - Observe: `madeCount.value` is non-negative at all times
  - Write property-based tests: for any successful fetch response containing an array of recipes, `madeCount` after the fetch equals the correct count derived from the response (i.e., `madeTotal` is correctly seeded from the response)
  - Verify tests pass on UNFIXED code (the steady-state after a full fetch is already correct; only the mid-flight window is broken)
  - **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms baseline steady-state behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 1.2, 1.3_

- [ ] 3. Fix Bug 1 — Introduce `madeTotal` ref and patch fetchSuggestions / makeRecipe / unmakeRecipe

  - [ ] 3.1 Add `madeTotal` ref and replace `madeCount` computed
    - In `RecipeSuggestions.vue` script, add `const madeTotal = ref<number>(0)` alongside the other state declarations
    - Replace the existing `madeCount` computed block with `const madeCount = computed(() => madeTotal.value)`
    - This decouples the badge value from the (transiently empty) `recipes.value` array
    - _Bug_Condition: isBugCondition(state) — `recipes.value` is empty during the loading window between `isLoading = true` and the fetch response_
    - _Expected_Behavior: `madeCount.value` reads from `madeTotal` which is updated synchronously, so it never reflects an in-flight empty state_
    - _Preservation: steady-state `madeCount` must still equal the correct count derived from the most recent fetch response_
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 3.2 Seed `madeTotal` from `fetchSuggestions` success block
    - After `recipes.value = data.recipes` in the `fetchSuggestions` try block, add:
      ```ts
      if (activeTab.value === 'all') {
        madeTotal.value = data.recipes.filter((r) => r.made).length
      } else if (activeTab.value === 'made') {
        madeTotal.value = data.recipes.length
      }
      ```
    - Ensures `madeTotal` is always authoritative after each completed fetch
    - _Requirements: 1.2, 1.3_

  - [ ] 3.3 Optimistically increment `madeTotal` in `makeRecipe`
    - In `makeRecipe()`, in the success block BEFORE `await fetchSuggestions()`, add: `madeTotal.value++`
    - This keeps the badge at its correct value during the subsequent re-fetch
    - _Requirements: 1.1_

  - [ ] 3.4 Optimistically decrement `madeTotal` in `unmakeRecipe`
    - In `unmakeRecipe()`, in the success block BEFORE `await fetchSuggestions()`, add: `madeTotal.value = Math.max(0, madeTotal.value - 1)`
    - Guards against the badge going negative if state is ever out of sync
    - _Requirements: 1.1_

  - [ ] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Stale madeCount During Async Fetch
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms `madeCount` no longer drops to 0 mid-flight
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 1.1_

  - [ ] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Correct madeCount After Full Fetch Cycle
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in steady-state count)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Fix Bug 2 — Add dark-mode contrast rules for active toggle buttons
  - In `dark-mode.css`, append the following rules in the `/* === Filter pills and segment toggles ===*/` region or at the end of the file:
    ```css
    html.ion-palette-dark .toggle-btn--active { color: #ffffff !important; }
    html.ion-palette-dark .toggle-btn--archived-active { color: #ffffff !important; }
    ```
  - These rules ensure active toggle button labels are readable against dark backgrounds
  - No existing rules are modified — additive only
  - _Requirements: 2.1_

- [ ] 5. Fix Bug 3 — Add dark-mode contrast rule for notification header title
  - In `dark-mode.css`, append the following rule in the `/* === Toolbars ===*/` region or at the end of the file:
    ```css
    html.ion-palette-dark .notif-header-title { color: var(--dm-text-primary) !important; }
    ```
  - Ensures the notification page header title is readable in dark mode
  - No existing rules are modified — additive only
  - _Requirements: 3.1_

- [ ] 6. Checkpoint — Ensure all tests pass
  - Run the full test suite to verify no regressions from any of the three fixes
  - Manually verify in the app (or simulator):
    - Made badge does not flicker to 0 when making/unmaking a recipe
    - Active toggle buttons show white text in dark mode
    - Notification header title is visible in dark mode
  - Ensure all tests pass; ask the user if questions arise
