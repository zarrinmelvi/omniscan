# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Stat Value Invisible in Dark Mode
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples demonstrating that `.stat-value` text is near-invisible in dark mode
  - **Scoped PBT Approach**: Scope the property to the concrete bug trigger — `html.ion-palette-dark` class active, `.stat-value` element rendered on the Home dashboard
  - Add `ion-palette-dark` class to `document.documentElement` to activate dark mode
  - Mount `HomePage.vue` with mocked API data (e.g., `pantryItemCount = 5`, `expiringItems.length = 2`)
  - Assert that `getComputedStyle(statValueEl).color` is NOT `rgb(15, 23, 42)` (i.e., NOT `#0f172a`)
  - Assert that `getComputedStyle(statValueEl).color` equals `rgb(241, 245, 249)` (`#f1f5f9`) — the expected high-contrast dark-mode value
  - Also cover: loading placeholder "—" (`isLoading = true`) and zero-count edge case (`pantryItemCount = 0`)
  - Run test on UNFIXED code — `dark-mode.css` has no `.stat-value` override yet
  - **EXPECTED OUTCOME**: Test FAILS (computed color is `rgb(15, 23, 42)` instead of `rgb(241, 245, 249)`) — this is correct, it proves the bug exists
  - Document counterexamples found (e.g., `getComputedStyle(statValueEl).color` returns `rgb(15, 23, 42)` when `html.ion-palette-dark` is active)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Light Mode and Non-Stat-Value Elements Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: In light mode (no `ion-palette-dark` class), `getComputedStyle(statValueEl).color` returns `rgb(15, 23, 42)` (`#0f172a`) on unfixed code
  - Observe: In dark mode, `.stat-card` background resolves to `var(--dm-bg-card)` (`#1e293b`) on unfixed code
  - Observe: In dark mode, `.activity-name`, `.recipe-title`, `.greeting-title` all resolve to their existing dark-mode override values on unfixed code
  - Write property-based test: for all combinations of `darkModeActive = false` and arbitrary pantry item counts (0–999), `.stat-value` computed color equals `rgb(15, 23, 42)` (light-mode color from Preservation Requirements in design)
  - Write property-based test: for all combinations of `darkModeActive = true/false`, existing dark-mode overrides (`.stat-card` background, `.activity-name`, `.recipe-title`, `.greeting-title`) remain their observed values — no regressions
  - Mount `PantryPage.vue` in dark mode and assert `.scanned-stat-row__value` still resolves to `var(--dm-text-primary)` (existing override must be untouched)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix: Add dark-mode `.stat-value` text-color override

  - [ ] 3.1 Implement the fix in `dark-mode.css`
    - Open `omniscan-ui/src/theme/dark-mode.css`
    - Locate the "Cards and surface containers" section (after the existing `.stat-card` background override)
    - Insert the following rule immediately after the existing card background overrides:
      ```css
      html.ion-palette-dark .stat-value {
        color: var(--dm-text-primary, #f1f5f9) !important;
      }
      ```
    - The `!important` flag matches the pattern used by adjacent overrides in the same file and ensures the rule wins over Vue's scoped attribute selector
    - Do NOT modify `HomePage.vue` scoped styles — `color: #0f172a` must remain for light mode
    - Do NOT modify any other file
    - _Bug_Condition: `isBugCondition(context)` where `context.darkModeActive = true` AND `context.elementClass = 'stat-value'` AND no dark-mode override exists for `.stat-value` in `dark-mode.css`_
    - _Expected_Behavior: `getComputedStyle(statValueEl).color` equals `rgb(241, 245, 249)` (`var(--dm-text-primary, #f1f5f9)`) for all `.stat-value` elements when `html.ion-palette-dark` is active_
    - _Preservation: Light-mode `.stat-value` retains `color: #0f172a`; all other dark-mode overrides in `dark-mode.css` remain exactly as they are; only an additive rule is introduced_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Stat Value Visible in Dark Mode
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (`.stat-value` color = `rgb(241, 245, 249)` in dark mode)
    - When this test passes, it confirms `html.ion-palette-dark .stat-value { color: var(--dm-text-primary) }` is correctly applied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — `.stat-value` text is now legible in dark mode)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Light Mode and Non-Stat-Value Elements Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — light mode, other dark-mode overrides, and PantryPage are all unaffected)
    - Confirm all tests still pass after fix
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite to confirm both the bug condition exploration test and the preservation property tests pass
  - Verify that toggling dark mode on and off in a browser shows `.stat-value` switching between `#f1f5f9` (dark) and `#0f172a` (light) correctly
  - Verify no visual regressions on Pantry, Profile, and Settings pages in dark mode
  - Ensure all tests pass; ask the user if questions arise
