# Implementation Plan

## Overview

Four frontend-only fixes in `omniscan-ui/src/`. No backend changes. Tasks are ordered from smallest blast radius to largest, with property-based exploration tests written before each fix to confirm root cause, and preservation tests written to lock in non-buggy behavior.

**Execution order:**
1. Item 4 — `AdminSettings.vue` (one file, no dark-mode.css risk)
2. Item 1 — `AdminSystemLogs.vue` scoped CSS (one file)
3. Items 2 & 3 — `dark-mode.css` append block (both CSS-only changes land together)
4. Final verification — type-check + behavioral checklist

**Files touched:**
- `omniscan-ui/src/views/admin/AdminSettings.vue`
- `omniscan-ui/src/views/admin/AdminSystemLogs.vue`
- `omniscan-ui/src/theme/dark-mode.css`

---

## Tasks

- [x] 1. Write bug condition exploration test for AI Model field mutability (Item 4)
  - **Property 1: Bug Condition** - AI Model Field Accepts User Input
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate `form.aiModel` is mutable via user input
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — `fieldId = "aiModel"`, `userAction = type` — to ensure reproducibility
  - Mount `AdminSettings.vue` with Vue Test Utils, navigate to the `ai` tab
  - For all strings in `["gpt-4", "custom-model", ""]`:
    - Simulate an `input` event on `#aiModel` with the candidate value
    - Assert `form.aiModel` remains `"Ollama Pro"` (from `isBugCondition_Item4` in design)
    - Assert `#aiModel` has `readOnly === true`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS — `form.aiModel` changes on each input, `readOnly` is absent
  - Document counterexample (e.g., "simulating input 'gpt-4' on #aiModel changes form.aiModel to 'gpt-4'; readOnly attribute absent")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 4.1, 4.2_

- [x] 2. Write preservation property tests for AdminSettings.vue other fields (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-aiModel Fields Continue to Accept Input
  - **IMPORTANT**: Follow observation-first methodology — observe behavior on UNFIXED code first
  - Observe: `form.appName` updates when user types into the app name field (unfixed code)
  - Observe: `form.language` updates when user changes the language dropdown (unfixed code)
  - Observe: notification toggle bindings update their respective `form.*` fields (unfixed code)
  - Write property-based test: for all fields where `fieldId ≠ "aiModel"`, simulate an input event and assert `form[fieldId]` reflects the new value (from Preservation Requirements 3.6 in design)
  - Write separate test: simulate form save with `aiModel` untouched, assert PUT payload includes `aiModel: "Ollama Pro"` (from Preservation Requirement 3.7 in design)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS — confirms baseline behavior for non-aiModel fields to preserve
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.6, 3.7_

- [x] 3. Fix Item 4 — Make AI Model field read-only in `AdminSettings.vue`

  - [x] 3.1 Update template — replace `v-model` with `:value` + `readonly` attribute
    - In the `v-if="activeTab === 'ai'"` block, locate the AI Model input
    - Replace `v-model="form.aiModel"` with `:value="form.aiModel"` (removes Vue two-way binding)
    - Add `readonly` attribute to the element
    - Add `readonly-field` to the element's `class` list alongside `text-input`
    - **Before:** `<input id="aiModel" v-model="form.aiModel" type="text" class="text-input" />`
    - **After:** `<input id="aiModel" :value="form.aiModel" type="text" class="text-input readonly-field" readonly />`
    - Rationale: `:value`-only removes the Vue-level write path; `readonly` provides the browser-enforced guard — defence-in-depth (see design)
    - _Bug_Condition: isBugCondition_Item4(fieldId, userAction) — fieldId = "aiModel", userAction = type_
    - _Expected_Behavior: form.aiModel UNCHANGED after any user input; aiModelField.readonly = true_
    - _Preservation: all other form fields continue to use v-model and accept input normally_
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 3.2 Update label — add "system default" badge next to "AI Model" label
    - Locate `<label for="aiModel" class="setting-title">AI Model</label>`
    - Replace with a label element that wraps both the text and a `<span class="field-locked-badge">system default</span>`
    - **After:**
      ```html
      <label for="aiModel" class="setting-title">
        AI Model <span class="field-locked-badge">system default</span>
      </label>
      ```
    - _Requirements: 4.4_

  - [x] 3.3 Add scoped CSS — `.readonly-field` and `.field-locked-badge` styles
    - Append to `<style scoped>` in `AdminSettings.vue`:
      ```css
      .readonly-field {
        opacity: 0.65;
        cursor: not-allowed;
        background: #f8fafc;
      }

      .field-locked-badge {
        display: inline-block;
        margin-left: 8px;
        padding: 2px 8px;
        background: #f1f5f9;
        color: #64748b;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        vertical-align: middle;
      }
      ```
    - _Requirements: 4.4_

  - [x] 3.4 Verify bug condition exploration test (Property 1) now passes
    - **Property 1: Expected Behavior** - AI Model Field Is Not Mutable
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: `form.aiModel` unchanged after typing; `readOnly === true`
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES — confirms the fix satisfies `isBugCondition_Item4` expected behavior
    - _Requirements: 4.3, 4.5_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-aiModel Fields Continue to Accept Input
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS — confirms no regressions to other settings fields or form save behavior
    - Confirm PUT payload still includes `aiModel: "Ollama Pro"` unchanged

---

- [x] 4. Write bug condition exploration test for active tab accent color (Item 1)
  - **Property 1: Bug Condition** - Active Tab Renders White Instead of Green
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples that demonstrate the active `.tab-btn` is not green
  - **Scoped PBT Approach**: Scope to `component = "AdminSystemLogs"`, `tabState = active` — deterministic failing case from `isBugCondition_Item1`
  - Mount `AdminSystemLogs.vue` with Vue Test Utils
  - For each tab button (e.g., "Overview", "API Latency"):
    - Click the tab to make it active
    - Assert the `.tab-btn.active` element has `background-color` computed as `#008744`
    - Assert `color` is `#ffffff`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS — computed `background-color` is `rgb(255, 255, 255)` (white), not `#008744`
  - Document counterexample (e.g., "clicking 'API Latency' tab renders .tab-btn.active with background-color: #ffffff")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1_

- [x] 5. Write preservation property tests for tab states in AdminSystemLogs (BEFORE implementing fix)
  - **Property 2: Preservation** - Inactive Tabs and Other Components Unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe behavior on UNFIXED code first
  - Observe: inactive `.tab-btn` elements have transparent / `--dm-bg-card`-derived background (unfixed code)
  - Observe: `AdminManageProductData.vue` active tab is green and unchanged (unfixed code)
  - Observe: `AdminSettings.vue` active tab is green and unchanged (unfixed code)
  - Write property-based test: for any sequence of tab IDs in `AdminSystemLogs.vue`, only the last-clicked tab has `background: #008744`; all others have a non-`#008744` background (from Preservation Requirements 3.1, 3.2 in design)
  - Write test: mount `AdminManageProductData.vue` and `AdminSettings.vue`, assert their active tab styles are unaffected
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS — confirms baseline tab behavior to preserve
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2_

- [x] 6. Fix Item 1 — Correct `.tab-btn.active` accent color in `AdminSystemLogs.vue`

  - [x] 6.1 Replace the `.tab-btn.active` scoped CSS rule
    - In `AdminSystemLogs.vue` `<style scoped>`, locate `.tab-btn.active`
    - **Before:**
      ```css
      .tab-btn.active {
        background: #ffffff;
        color: #0f172a;
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }
      ```
    - **After:**
      ```css
      .tab-btn.active {
        background: #008744;
        color: #ffffff;
        font-weight: 600;
        border-color: #008744;
      }
      ```
    - Changes: `background` → `#008744`, `color` → `#ffffff`, remove `box-shadow`, add `border-color: #008744`
    - Leave all other `.tab-btn` rules (base rule, hover state) completely untouched
    - _Bug_Condition: isBugCondition_Item1(component, tabState) — component = "AdminSystemLogs", tabState = active_
    - _Expected_Behavior: rendered.backgroundColor = "#008744"; rendered.color = "#ffffff"_
    - _Preservation: all non-active .tab-btn rules and all other components' tab styles unchanged_
    - _Requirements: 2.1, 3.1, 3.2_

  - [x] 6.2 Verify bug condition exploration test (Property 1) now passes
    - **Property 1: Expected Behavior** - Active Tab Renders Green
    - **IMPORTANT**: Re-run the SAME test from task 4 — do NOT write a new test
    - Run bug condition exploration test from step 4
    - **EXPECTED OUTCOME**: Test PASSES — `.tab-btn.active` computed `background-color` is `#008744`
    - _Requirements: 2.1_

  - [x] 6.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Inactive Tabs and Other Components Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 5 — do NOT write new tests
    - Run preservation property tests from step 5
    - **EXPECTED OUTCOME**: Tests PASS — inactive tabs and sibling components unaffected

---

- [x] 7. Write bug condition exploration tests for dark-mode CSS gaps (Items 2 & 3)
  - **Property 1: Bug Condition** - Dark-Mode Elements Render with Light-Mode Colors
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples for Items 2 (coverage gaps) and 3 (active-tab dark overrides)
  - **Scoped PBT Approach**: Scope to `themeClass = "ion-palette-dark"` AND the specific element classes from `isBugCondition_Item2` / `isBugCondition_Item3`
  - **Item 2 — Dashboard and System Logs legibility:**
    - Add `ion-palette-dark` to `document.documentElement.classList`
    - Mount `AdminDashboard.vue`, assert for each affected class:
      - `.stat-card` `background-color` ≠ light-mode defaults (`#f2fbf5`, `#fffaf0`, `#f0f7ff`)
      - `.stat-label` `color` ≠ `#4b5563`
      - `table th` `color` ≠ `#6b7280`; `border-bottom-color` ≠ `#f3f4f6`
      - `table td` `border-bottom-color` ≠ `#f3f4f6`
      - `.status-badge.pending` `background-color` ≠ `#fef3c7`
    - Mount `AdminSystemLogs.vue` in dark mode, assert:
      - `.chart-header h2` `color` uses dark-mode token value
      - `.alert-box` `background-color` ≠ `#fffbeb`
  - **Item 3 — Active tab dark overrides:**
    - Dark mode ON, click a tab in `AdminSystemLogs.vue`, assert `.tab-btn.active` `background` = `#008744` (not `var(--dm-bg-subtle)` grey)
    - Assert DevTools / computed styles show a matching `html.ion-palette-dark .tabs-bar .tab-button.active` rule exists
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL — light-mode colors and grey active-tab background confirmed
  - Document counterexamples (e.g., ".stat-card retains background-color: #f2fbf5 in dark mode")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.3, 3.4_

- [x] 8. Write preservation property tests for existing dark-mode rules (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Dark-Mode Rules and Light-Mode Styles Unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe behavior on UNFIXED code first
  - Observe: `html.ion-palette-dark .tabs-bar .tab-button` (inactive) has correct dark background (unfixed code)
  - Observe: `html.ion-palette-dark .settings-tabs .tab-button` rules are intact (unfixed code)
  - Observe: all admin pages not listed in this spec render with their existing dark-mode styles (unfixed code)
  - Observe: light-mode renders for `AdminDashboard.vue` and `AdminSystemLogs.vue` are unaffected by dark toggle (unfixed code)
  - Write property-based test: for any admin page not in this spec (`themeClass = "ion-palette-dark"`), assert all existing dark-mode rules produce the same computed styles before and after (from Preservation Requirements 3.3, 3.4, 3.5 in design)
  - Write test: light mode ON, assert `AdminDashboard.vue` and `AdminSystemLogs.vue` continue to use their scoped light-mode colors unchanged
  - Write test: `html.ion-palette-dark .nav-item.active` retains `background: #008744` (sidebar active state must not change)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS — confirms existing dark-mode baseline to preserve
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.3, 3.4, 3.5_

- [x] 9. Fix Items 2 & 3 — Append dark-mode overrides to `omniscan-ui/src/theme/dark-mode.css`

  - [x] 9.1 Append AdminDashboard dark-mode overrides (Item 2)
    - Append after the last rule currently in `dark-mode.css` (after `.batch-toolbar`)
    - Add `/* --- AdminDashboard dark-mode overrides (Item 2) --- */` comment header
    - Add `.dashboard` root: `background-color: var(--dm-bg-page); color: var(--dm-text-primary)`
    - Add `.dashboard h1` and `.dashboard h2` heading overrides: `color: var(--dm-text-primary)`
    - Add `.dashboard .stat-card`: `background: var(--dm-bg-card) !important; border-color: var(--dm-border) !important`
    - Add tinted card variants:
      - `.dashboard .green-card`: `background-color: rgba(0, 135, 68, 0.1) !important`
      - `.dashboard .orange-card`: `background-color: rgba(234, 88, 12, 0.1) !important`
      - `.dashboard .blue-card`: `background-color: rgba(37, 99, 235, 0.1) !important`
    - Add `.stat-label`: `color: var(--dm-text-secondary) !important` (covers both Dashboard and System Logs)
    - Add `.stat-value`: `color: var(--dm-text-primary)`
    - Add `.stat-footer-text`: `color: var(--dm-text-secondary)`
    - Add `.recent-section`: `background: var(--dm-bg-card) !important; border-color: var(--dm-border) !important`
    - Add `.recent-header h2`: `color: var(--dm-text-primary)`
    - Add `.view-all-link`: `color: #4ade80`
    - Add `.dashboard th`: `color: var(--dm-text-secondary) !important; border-bottom-color: var(--dm-border) !important; background: var(--dm-bg-subtle) !important`
    - Add `.dashboard td`: `border-bottom-color: var(--dm-border) !important`
    - Add status badge variants: `.status-badge.pending` (rgba amber tint, `#fbbf24`), `.status-badge.approved` (rgba green tint, `#4ade80`), `.status-badge.dismissed` (`var(--dm-bg-subtle)`, `var(--dm-text-secondary)`)
    - Add `.dashboard .empty-note`: `color: var(--dm-text-secondary)`
    - Add `.dashboard .error`: `color: #f87171`
    - **Scoping note**: Use `.dashboard .stat-card` (not bare `.stat-card`) to avoid conflicting with the existing generic `html.ion-palette-dark .stat-card` rule that already covers System Logs stat cards
    - _Bug_Condition: isBugCondition_Item2(themeClass, component) — themeClass = "ion-palette-dark", component = "AdminDashboard"_
    - _Expected_Behavior: rendered[".stat-card"].backgroundColor ≠ lightModeDefault; rendered[".stat-label"].color meets dark-surface contrast_
    - _Preservation: existing light-mode scoped CSS in AdminDashboard.vue and AdminSystemLogs.vue untouched; rules scoped to .dashboard ancestor to avoid collisions_
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 9.2 Append AdminSystemLogs additional dark-mode overrides (Item 2)
    - Continue the same append block
    - Add `/* --- AdminSystemLogs additional dark-mode overrides (Item 2) --- */` comment header
    - Add `.chart-header h2`: `color: var(--dm-text-primary)`
    - Add `.chart-subtitle`: `color: var(--dm-text-secondary)`
    - Add `.time-labels`: `color: var(--dm-text-secondary)`
    - Add `.alert-box`: `background-color: rgba(234, 179, 8, 0.1); border-color: rgba(234, 179, 8, 0.3); color: #fbbf24`
    - Add `.uptime-val`: `color: var(--dm-text-primary)`
    - _Bug_Condition: isBugCondition_Item2_SystemLogs(themeClass, element) — themeClass = "ion-palette-dark", element in [".chart-header h2", ".chart-subtitle", ".alert-box", ".uptime-val"]_
    - _Expected_Behavior: all listed elements carry --dm-* token-derived colors in dark mode_
    - _Requirements: 2.6_

  - [x] 9.3 Fix existing `.tab-btn.active` dark-mode override and add missing `.tabs-bar .tab-button.active` rule (Item 3)
    - Continue the same append block
    - Add `/* --- Active tab — green accent in dark mode (Items 2 & 3) --- */` comment header
    - Add updated `html.ion-palette-dark .tab-btn.active`: `background: #008744 !important; color: #ffffff !important; border-color: #008744 !important`
      - This **overrides** (via specificity and `!important`) the existing rule that set `--dm-bg-subtle` / `--dm-text-primary` (muted grey)
    - Add new `html.ion-palette-dark .tabs-bar .tab-button.active`: `background: #008744; color: #ffffff; border-color: #008744`
      - This rule was entirely absent; adds dark-mode coverage for the `.tabs-bar` variant selector
    - _Bug_Condition: isBugCondition_Item3(themeClass, tabState, tabClass) — themeClass = "ion-palette-dark", tabState = active, tabClass in [".tab-btn", ".tabs-bar .tab-button"]_
    - _Expected_Behavior: rendered.backgroundColor = "#008744"; rendered.color = "#ffffff" for all active dark-mode tabs_
    - _Preservation: html.ion-palette-dark .tabs-bar .tab-button (inactive) rule untouched; html.ion-palette-dark .settings-tabs .tab-button rules untouched_
    - _Requirements: 3.3, 3.4_

  - [x] 9.4 Append readonly-field dark-mode overrides for Item 4
    - Continue the same append block (keeping all Items 2, 3, and 4 dark-mode CSS in one atomic append)
    - Add `html.ion-palette-dark .readonly-field`: `background: var(--dm-bg-subtle) !important`
    - Add `html.ion-palette-dark .field-locked-badge`: `background: var(--dm-bg-subtle); color: var(--dm-text-secondary)`
    - _Preservation: scoped selectors ensure no other inputs are affected_
    - _Requirements: 4.4_

  - [x] 9.5 Verify bug condition exploration tests (Property 1) now pass
    - **Property 1: Expected Behavior** - Dark-Mode Elements Render with Token-Derived Colors
    - **IMPORTANT**: Re-run the SAME tests from task 7 — do NOT write new tests
    - Run all dark-mode bug condition exploration tests from step 7
    - **EXPECTED OUTCOME**: Tests PASS — `.stat-card`, `.stat-label`, `th`, `td`, `.status-badge.*`, `.chart-header h2`, `.alert-box`, and active tab elements all carry dark-mode-appropriate values
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.3, 3.4_

  - [x] 9.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Dark-Mode Rules and Light-Mode Styles Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 8 — do NOT write new tests
    - Run preservation property tests from step 8
    - **EXPECTED OUTCOME**: Tests PASS — existing inactive-tab rules, sidebar active state, other admin pages, and light-mode renders all unchanged

---

- [ ] 10. Checkpoint — Ensure all tests pass
  - Run the full test suite (e.g., `vitest --run`) in `omniscan-ui/`
  - Ensure all tests pass; ask the user if any questions arise
  - Run `vue-tsc --noEmit` in `omniscan-ui/` and confirm zero TypeScript errors
    - Redirect output to a file if terminal is flaky: `vue-tsc --noEmit > tsc-output.txt 2>&1`
    - Review `tsc-output.txt` and fix any type errors before marking complete
  - Behavioral checklist — verify in a running browser session:
    - Active tab in `AdminSystemLogs.vue` is green (`#008744`) in light mode
    - Active tab in `AdminSystemLogs.vue` is green (`#008744`) in dark mode
    - `AdminDashboard.vue` renders correctly in dark mode: stat cards use dark surface, labels/values are legible, table headers/rows have visible borders, status badges are readable
    - Active tabs in `AdminManageProductData.vue` are green in dark mode
    - Active tabs in `AdminSettings.vue` (`.tabs-bar`) are green in dark mode
    - AI Model field shows "system default" badge and rejects typing in both light and dark mode
    - All other `AdminSettings.vue` form fields accept input normally
    - Settings form save still submits `aiModel: "Ollama Pro"` unchanged

---

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "label": "Item 4 exploration + preservation", "tasks": ["1", "2"] },
    { "wave": 2, "label": "Item 4 implementation", "tasks": ["3"] },
    { "wave": 3, "label": "Item 1 exploration + preservation", "tasks": ["4", "5"] },
    { "wave": 4, "label": "Item 1 implementation", "tasks": ["6"] },
    { "wave": 5, "label": "Items 2 and 3 exploration + preservation", "tasks": ["7", "8"] },
    { "wave": 6, "label": "Items 2 and 3 implementation", "tasks": ["9"] },
    { "wave": 7, "label": "Final checkpoint", "tasks": ["10"] }
  ],
  "dependencies": {
    "1": [],
    "2": ["1"],
    "3": ["1", "2"],
    "4": ["3"],
    "5": ["4"],
    "6": ["4", "5"],
    "7": ["6"],
    "8": ["7"],
    "9": ["7", "8"],
    "10": ["3", "6", "9"]
  }
}
```

---

## Notes

- **Exploration tests run on unfixed code**: Tasks 1, 4, and 7 must be written and run BEFORE their corresponding implementation tasks (3, 6, 9). Expected to FAIL — this confirms the bug. Do not fix the code to make them pass; proceed to the implementation task.
- **Preservation tests run on unfixed code**: Tasks 2, 5, and 8 must also be completed before implementation. Expected to PASS — this locks in baseline behavior.
- **Items 2 & 3 share one append block**: All dark-mode additions (dashboard, system-logs supplemental, active-tab overrides, readonly-field overrides) are written as a single contiguous append to `dark-mode.css`. This avoids multiple file writes and keeps related rules together.
- **`.dashboard` scoping**: The `.dashboard .stat-card` selector (and `.dashboard th` / `.dashboard td`) deliberately includes the `.dashboard` ancestor to avoid conflicting with the existing generic `html.ion-palette-dark .stat-card` rule that already covers System Logs. Do not remove this scoping.
- **`!important` usage**: Used only where the existing specificity of scoped Vue CSS would otherwise win. Applied selectively on `.stat-card`, `.green/orange/blue-card`, `.stat-label`, `.recent-section`, table cells, and the `.tab-btn.active` override. Do not add `!important` beyond what is specified.
- **No backend changes**: `nitro-app` is not touched. This is confirmed as frontend-only in both requirements and design documents.
- **`vue-tsc` output**: If the terminal hangs, redirect to a file (`vue-tsc --noEmit > tsc-output.txt 2>&1`) and review the file contents.
