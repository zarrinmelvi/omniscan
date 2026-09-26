# Recipe State & Dark Mode Contrast Bugfix Design

## Overview

This spec covers three distinct bugs in OmniScan (Ionic Vue):

1. **Bug 1 — Recipe "Made" badge flash** (`RecipeSuggestions.vue`): After a user marks a recipe as made, `fetchSuggestions()` is called to refresh the list. When on the "all" tab, the suggest endpoint only returns recipes the user _can_ make — it does not guarantee the `made: true` flag is present. The `madeCount` computed re-derives its value from the freshly fetched `recipes.value`, so if the suggest endpoint omits `made: true` on returned recipes, `madeCount` instantly drops to 0, causing the badge to flash or disappear.

2. **Bug 2 — Pantry toggle button text invisible in dark mode** (`dark-mode.css`): The global dark-mode rule `.toggle-btn { color: var(--dm-text-secondary) }` overrides the scoped component rule `.toggle-btn--active { color: #ffffff }` because the global stylesheet loads after scoped styles and wins the cascade. Active toggle buttons become invisible against their dark background.

3. **Bug 3 — Notifications header title invisible in dark mode** (`dark-mode.css`): The `.notif-header-title` class uses a hardcoded `color: #111827` (near-black) in its scoped styles. No dark-mode override exists for this class — only `.notif-title` (the per-notification body title) is covered. The result is an invisible title on dark toolbar backgrounds.

The fix strategy is minimal and additive: Bug 1 requires introducing a stable `madeTotal` ref in `RecipeSuggestions.vue`; Bugs 2 and 3 require two additive CSS rules in `dark-mode.css`.

---

## Glossary

- **Bug_Condition (C)**: The specific input state or code path that triggers the incorrect behavior
- **Property (P)**: The correct, expected behavior that should hold for all bug-condition inputs after the fix
- **Preservation**: Behaviors that must remain unchanged by the fix (non-bug-condition inputs)
- **madeCount**: The Vue computed property in `RecipeSuggestions.vue` that drives the `Made` tab badge count
- **madeTotal**: The new stable `ref<number>(0)` that replaces the volatile computed derivation
- **fetchSuggestions()**: The function in `RecipeSuggestions.vue` that fetches tab-specific recipe data from the backend
- **activeTab**: The `ref<RecipeTab>` controlling which endpoint is fetched (`'all'`, `'liked'`, `'made'`)
- **TAB_ENDPOINTS**: Record mapping `RecipeTab` values to API endpoint strings
- **ion-palette-dark**: The HTML class toggled by `SettingsPage.vue` to activate dark mode across the app
- **Scoped styles**: Vue component styles compiled with a `[data-v-xxxx]` attribute selector suffix, lowering effective specificity in the global cascade
- **`.toggle-btn--active`**: Scoped class applied to the active state of pantry view-toggle buttons
- **`.toggle-btn--archived-active`**: Scoped class applied to the active state of archived view-toggle buttons
- **`.notif-header-title`**: Scoped class applied to the `ion-title` element inside the Notifications page toolbar

---

## Bug Details

### Bug 1 — Recipe "Made" Badge Flash

#### Bug Condition

The flash occurs when all three of these conditions are true simultaneously:

1. The user is on the `'all'` tab (`activeTab.value === 'all'`)
2. `makeRecipe()` or `unmakeRecipe()` completes successfully and calls `await fetchSuggestions()`
3. The `/api/recipes/suggest` endpoint response does not include `made: true` on the returned recipes (because it returns recipes you _can_ make, not recipes already made)

The `madeCount` computed derives its value from `recipes.value` after every fetch, so its value is only as stable as the latest API response.

**Formal Specification:**
```
FUNCTION isBugCondition(state)
  INPUT: state = { activeTab, recipesAfterFetch, previousMadeCount }
  OUTPUT: boolean

  RETURN state.activeTab === 'all'
         AND fetchSuggestionsJustCompleted(state)
         AND state.recipesAfterFetch.filter(r => r.made).length !== state.previousMadeCount
END FUNCTION
```

#### Examples

- **Flash to zero**: User is on "all" tab with 3 made recipes shown (badge = 3). They make a 4th recipe. `fetchSuggestions()` returns 10 recipes from `/api/recipes/suggest`, none with `made: true`. Badge jumps from 3 → 0, then the refetch data settles. Expected: badge shows 4.
- **Flash on unmake**: User unmakes a recipe on the "all" tab. `fetchSuggestions()` runs, returns recipes without `made` flags. Badge drops to 0 instead of decrementing by 1. Expected: badge decrements to current value − 1.
- **Non-flash case (stable)**: User switches to the `'made'` tab. `fetchSuggestions()` fetches `/api/recipes/made` which returns exactly the made recipes. `madeCount` correctly equals `recipes.value.length`. No flash.

---

### Bug 2 — Pantry Toggle Button Text Invisible in Dark Mode

#### Bug Condition

The bug manifests when the user has dark mode enabled (`html.ion-palette-dark` is set) and a pantry view-toggle button is in the active state (has `.toggle-btn--active` or `.toggle-btn--archived-active`).

**Formal Specification:**
```
FUNCTION isBugCondition(element)
  INPUT: element = a DOM button element
  OUTPUT: boolean

  RETURN darkModeEnabled()
         AND element.classList.contains('toggle-btn')
         AND (element.classList.contains('toggle-btn--active')
              OR element.classList.contains('toggle-btn--archived-active'))
         AND computedColor(element) !== '#ffffff'
END FUNCTION
```

#### Examples

- **List view active**: User enables dark mode and switches to list view. The "List" toggle button has `.toggle-btn--active`. Its scoped style sets `color: #ffffff`, but the global dark-mode rule `.toggle-btn { color: var(--dm-text-secondary) }` overrides it. Text renders as `#94a3b8` (muted blue-gray) against a similarly dark background — invisible or near-invisible.
- **Grid view active**: Same scenario but the "Grid" button is active. Same outcome.
- **Archived section active toggle**: Same cascade issue applies to `.toggle-btn--archived-active`.
- **Inactive toggle button (not a bug)**: Inactive `.toggle-btn` elements without the `--active` modifier class correctly render in `--dm-text-secondary` — this is the intended behavior and must be preserved.

---

### Bug 3 — Notifications Header Title Invisible in Dark Mode

#### Bug Condition

The bug manifests when dark mode is enabled and the user is on the Notifications page. The `ion-title` element carrying the `.notif-header-title` class uses a hardcoded `color: #111827` from scoped styles that is never overridden in `dark-mode.css`.

**Formal Specification:**
```
FUNCTION isBugCondition(element)
  INPUT: element = a DOM element
  OUTPUT: boolean

  RETURN darkModeEnabled()
         AND element.classList.contains('notif-header-title')
         AND computedColor(element) === '#111827'
END FUNCTION
```

#### Examples

- **Notifications page in dark mode**: User navigates to Notifications. The toolbar has a dark background (`--dm-header-bg: #1e293b`). The "Notifications" title text renders as `#111827` (near-black) — invisible against the dark toolbar. Expected: title renders as `var(--dm-text-primary)` (#f1f5f9).
- **`ion-title` shadow DOM resistance**: `ion-title` uses shadow DOM parts that can resist `color` inheritance from parent selectors. The fix requires `!important` to pierce through this and the scoped style rule.
- **Light mode (not a bug)**: `.notif-header-title` with `color: #111827` on a white/light toolbar is fully legible — this must be preserved.

---

## Expected Behavior

### Bug 1 — Preservation Requirements

**Unchanged Behaviors:**
- Switching between tabs must continue to fetch the correct endpoint and update the recipes list
- Mouse clicks, card taps, and like/unlike interactions must work exactly as before
- The `'made'` tab display (showing all made recipes without filtering) must remain unchanged
- The result modal after making a recipe must continue to appear with correct data
- The alert confirmation flow before making a recipe must remain unchanged
- The `'liked'` tab badge logic is independent and must not be affected

**Scope:**
All interactions that do NOT involve the `madeCount` badge (tab switching, liking recipes, viewing detail modals, the unmade/made flow on the `'made'` tab directly) should be completely unaffected. The only behavioral change is how the `madeCount` value is maintained across `fetchSuggestions()` calls.

### Bug 2 — Preservation Requirements

**Unchanged Behaviors:**
- Inactive `.toggle-btn` elements must continue to render in `--dm-text-secondary` in dark mode
- Light mode styling for all toggle buttons must be completely unaffected (the fix is scoped to `html.ion-palette-dark`)
- Toggle button backgrounds and borders must remain unchanged

**Scope:**
Only the `color` property of active-state toggle buttons in dark mode is affected. No structural, layout, or light-mode changes are made.

### Bug 3 — Preservation Requirements

**Unchanged Behaviors:**
- The existing `.notif-title` (per-notification body title) dark-mode rule must remain unchanged
- Light mode rendering of `.notif-header-title` must be completely unaffected
- All other toolbar and header title colors in dark mode must be unaffected

**Scope:**
Only the `color` of `.notif-header-title` elements in dark mode is affected by the additive CSS rule.

---

## Hypothesized Root Cause

### Bug 1

1. **Derived state from volatile source**: `madeCount` is a `computed()` that reads `recipes.value` on every render. `recipes.value` is wholesale replaced on every successful `fetchSuggestions()` call. The suggest endpoint (`/api/recipes/suggest`) returns recipes the user _can_ make based on pantry — not all previously-made recipes. Any recipe previously marked `made: true` that is still cookable might have the flag, but there is no guarantee. The computed has no memory of prior state.

2. **No optimistic increment on make/unmake**: `makeRecipe()` does set `affected.made = true` optimistically on the specific recipe object, but then immediately calls `await fetchSuggestions()`, which replaces the entire `recipes.value` array, discarding that optimistic update.

3. **Tab-dependent behavior that is unaccounted for**: The bug only surfaces on the `'all'` tab because the `'made'` tab fetches `/api/recipes/made`, which returns precisely the made recipes — so `recipes.value.length` is accurate. The computed conflates two entirely different derivation strategies depending on which tab is active, creating a structural fragility.

### Bug 2

1. **CSS cascade order**: Vue scoped styles are injected into the `<head>` in component mount order. The global `dark-mode.css` is imported in `main.ts` or `App.vue` and typically loads last. When both `.toggle-btn` (global dark-mode rule) and `.toggle-btn--active` (scoped rule) apply to the same element, the global rule wins purely due to source order, not specificity.

2. **Missing modifier-specific override**: The dark-mode CSS file overrides `.toggle-btn` (base inactive state) but does not include a separate rule for `.toggle-btn--active` or `.toggle-btn--archived-active`. The base override unintentionally stomps the scoped active state.

### Bug 3

1. **Incomplete coverage in dark-mode.css**: The existing rule `html.ion-palette-dark .notif-title` targets per-notification body titles. The toolbar title uses a different class (`.notif-header-title`) that was never added to the overrides.

2. **`ion-title` shadow DOM**: Ionic's `ion-title` component renders its slot content inside a shadow DOM host. Some color inheritance is blocked at the shadow boundary. The `!important` flag on the override is necessary to ensure the rule is applied with sufficient priority to pierce through both the shadow DOM and the specificity of the scoped component style.

---

## Correctness Properties

Property 1: Bug Condition — Made Badge Count Stability After Fetch

_For any_ app state where `makeRecipe()` or `unmakeRecipe()` completes successfully and subsequently calls `fetchSuggestions()` on the `'all'` tab, the fixed `madeCount` computed SHALL reflect the updated total of made recipes (previous count + 1 for make, previous count − 1 for unmake, floored at 0), regardless of whether the fetched recipe objects carry a `made: true` flag.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Non-Make/Unmake Recipe State Stability

_For any_ interaction that does NOT involve `makeRecipe()` or `unmakeRecipe()` (tab switching, liking, viewing modals, initial load), the fixed `madeCount` and `madeTotal` logic SHALL produce the same rendered badge count as the original code produced when on the `'made'` tab (where the original was correct), and shall not alter any other existing recipe state behavior.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 3: Bug Condition — Active Toggle Button Text Visible in Dark Mode

_For any_ pantry view-toggle button in the active state (`.toggle-btn--active` or `.toggle-btn--archived-active`) when dark mode is enabled (`html.ion-palette-dark`), the fixed dark-mode.css SHALL render the button text as `#ffffff`, ensuring sufficient contrast against the button's dark background.

**Validates: Requirements 2.3**

Property 4: Preservation — Inactive Toggle Button Styling Unchanged

_For any_ pantry view-toggle button in the inactive state (`.toggle-btn` without `--active` modifier) under dark mode, the fixed CSS SHALL produce exactly the same `color: var(--dm-text-secondary)` as the original code, preserving the intended muted appearance for inactive buttons.

**Validates: Requirements 3.4**

Property 5: Bug Condition — Notifications Header Title Visible in Dark Mode

_For any_ element carrying the `.notif-header-title` class when dark mode is enabled, the fixed dark-mode.css SHALL render the text color as `var(--dm-text-primary)` (`#f1f5f9`), ensuring the Notifications page toolbar title is legible against its dark background.

**Validates: Requirements 2.4**

Property 6: Preservation — Notifications Header Title Unchanged in Light Mode

_For any_ element carrying the `.notif-header-title` class when dark mode is NOT enabled, the fixed CSS SHALL produce the same rendered color as the original code (the scoped `color: #111827`), preserving legibility on light toolbar backgrounds.

**Validates: Requirements 3.5**

---

## Fix Implementation

### Bug 1 — Changes Required

**File**: `omniscan-ui/src/views/RecipeSuggestions.vue`

**Function/Section**: `<script setup>` — state declarations, `madeCount` computed, `fetchSuggestions`, `makeRecipe`, `unmakeRecipe`

**Specific Changes:**

1. **Add `madeTotal` ref**: Declare `const madeTotal = ref<number>(0)` alongside the existing reactive state declarations. This ref holds the stable, mutation-tracked count of made recipes.

2. **Replace `madeCount` computed**: Replace the existing derived computed:
   ```ts
   // BEFORE
   const madeCount = computed(() => {
     if (activeTab.value === 'made') return recipes.value.length
     return recipes.value.filter((r) => r.made).length
   })
   ```
   With a simple passthrough computed:
   ```ts
   // AFTER
   const madeCount = computed(() => madeTotal.value)
   ```

3. **Update `fetchSuggestions()` success block**: After `recipes.value = data.recipes`, conditionally update `madeTotal` based on the active tab:
   ```ts
   if (activeTab.value === 'all') {
     madeTotal.value = data.recipes.filter((r) => r.made).length
   } else if (activeTab.value === 'made') {
     madeTotal.value = data.recipes.length
   }
   // 'liked' tab: do not update madeTotal — it is independent
   ```

4. **Update `makeRecipe()` success block**: After the existing optimistic update, increment `madeTotal`:
   ```ts
   madeTotal.value++
   ```
   This increment must occur BEFORE `await fetchSuggestions()` so the optimistic count is visible immediately.

5. **Update `unmakeRecipe()` success block**: Before calling `await fetchSuggestions()`, decrement with floor:
   ```ts
   madeTotal.value = Math.max(0, madeTotal.value - 1)
   ```

---

### Bug 2 — Changes Required

**File**: `omniscan-ui/src/theme/dark-mode.css`

**Section**: Append under the existing `html.ion-palette-dark .toggle-btn` rule

**Specific Changes:**

Add two additive rules that override the base `.toggle-btn` color for active-state variants:

```css
html.ion-palette-dark .toggle-btn--active { color: #ffffff !important; }
html.ion-palette-dark .toggle-btn--archived-active { color: #ffffff !important; }
```

The `!important` ensures these rules win the cascade regardless of load order relative to scoped component styles.

---

### Bug 3 — Changes Required

**File**: `omniscan-ui/src/theme/dark-mode.css`

**Section**: Append under or near the existing `.notif-title` rule

**Specific Changes:**

Add one additive rule:

```css
html.ion-palette-dark .notif-header-title { color: var(--dm-text-primary) !important; }
```

The `!important` is required to override both the scoped `color: #111827` and to pierce `ion-title`'s shadow DOM color resistance.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach for each bug: first, surface counterexamples that demonstrate the bug on the unfixed code, then verify the fix works correctly and preserves existing behavior.

---

### Bug 1 — Exploratory Bug Condition Checking

**Goal**: Demonstrate that `madeCount` drops to 0 after `makeRecipe()` triggers a `fetchSuggestions()` call on the "all" tab when the API returns recipes without `made: true`.

**Test Plan**: Mock `apiFetch` so that `/api/recipes/suggest` returns a list of recipes all with `made: false`. Trigger `makeRecipe()` and observe `madeCount` before and after `fetchSuggestions()` resolves. Run on unfixed code to confirm the flash.

**Test Cases**:
1. **Make recipe on "all" tab — suggest returns no `made` flags** (will fail on unfixed code): `madeCount` should be 1 after making, but drops to 0 after fetch
2. **Unmake recipe on "all" tab — suggest returns no `made` flags** (will fail on unfixed code): `madeCount` should decrement by 1, but drops to 0 after fetch
3. **Make recipe on "made" tab** (should not fail): Fetches `/api/recipes/made`, returns made recipes — `madeCount` correctly equals `recipes.value.length`
4. **Initial load on "all" tab with pre-existing made recipes** (may or may not fail): Depends on whether the suggest endpoint includes `made: true` for made recipes

**Expected Counterexamples**:
- `madeCount` transitions from N → 0 in the render cycle immediately after `fetchSuggestions()` resolves when on the "all" tab

---

### Bug 1 — Fix Checking

**Goal**: Verify that after the fix, `madeCount` reflects the correct value through the entire `makeRecipe()` / `unmakeRecipe()` lifecycle.

**Pseudocode:**
```
FOR ALL state WHERE isBugCondition(state) DO
  result := madeCount_after_fetchSuggestions(state)
  ASSERT result === previousMadeCount + 1   // for makeRecipe
  OR ASSERT result === max(0, previousMadeCount - 1)  // for unmakeRecipe
END FOR
```

---

### Bug 1 — Preservation Checking

**Goal**: Verify that tab switching, liking, and other recipe interactions still produce correct `madeCount` values (0 when no made recipes exist on initial all-tab load; correct count when switching to `'made'` tab).

**Pseudocode:**
```
FOR ALL state WHERE NOT isBugCondition(state) DO
  ASSERT madeCount_fixed(state) === madeCount_original_on_made_tab(state)
END FOR
```

**Test Cases**:
1. **Tab switch to `'made'`**: `madeTotal` updates from `data.recipes.length` — same as original behavior on that tab
2. **Tab switch to `'liked'`**: `madeTotal` is NOT updated — badge count from prior state is preserved
3. **Initial load**: `madeTotal` is set from `data.recipes.filter(r => r.made).length` on the `'all'` tab — matches what the original computed would have returned if `made` flags were present

---

### Bug 2 — Exploratory Bug Condition Checking

**Goal**: Confirm that `.toggle-btn--active` text is invisible in dark mode on unfixed code.

**Test Plan**: Render the pantry page with dark mode enabled. Activate the list/grid view toggle. Inspect computed `color` on the active button. Run on unfixed code.

**Test Cases**:
1. **Active toggle in dark mode** (will fail on unfixed code): `computedColor(activeToggleBtn)` should be `#ffffff` but is `#94a3b8`
2. **Inactive toggle in dark mode** (should not fail): `computedColor(inactiveToggleBtn)` should be `#94a3b8` — this is the preserved behavior
3. **Active toggle in light mode** (should not fail): Dark-mode rules do not apply, scoped styles render correctly

**Expected Counterexamples**:
- Active toggle button color resolves to `var(--dm-text-secondary)` instead of `#ffffff`

---

### Bug 2 — Fix Checking

**Pseudocode:**
```
FOR ALL element WHERE isBugCondition(element) DO
  result := computedColor(element, withDarkModeCSS_fixed)
  ASSERT result === '#ffffff'
END FOR
```

---

### Bug 2 — Preservation Checking

**Pseudocode:**
```
FOR ALL element WHERE NOT isBugCondition(element) DO
  ASSERT computedColor(element, withDarkModeCSS_fixed)
       === computedColor(element, withDarkModeCSS_original)
END FOR
```

**Test Cases**:
1. **Inactive toggle button in dark mode**: Color remains `var(--dm-text-secondary)` — unchanged
2. **Any toggle button in light mode**: No dark-mode rules apply — unchanged

---

### Bug 3 — Exploratory Bug Condition Checking

**Goal**: Confirm that `.notif-header-title` is invisible in dark mode on unfixed code.

**Test Cases**:
1. **Notifications header title in dark mode** (will fail on unfixed code): `computedColor(.notif-header-title)` should be `#f1f5f9` but is `#111827`
2. **Notifications header title in light mode** (should not fail): Color `#111827` on light background is correct and must be preserved

**Expected Counterexamples**:
- Title renders as near-black `#111827` against dark toolbar background `#1e293b`

---

### Bug 3 — Fix Checking

**Pseudocode:**
```
FOR ALL element WHERE isBugCondition(element) DO
  result := computedColor(element, withDarkModeCSS_fixed)
  ASSERT result === '#f1f5f9'  // var(--dm-text-primary) resolved
END FOR
```

---

### Bug 3 — Preservation Checking

**Pseudocode:**
```
FOR ALL element WHERE NOT isBugCondition(element) DO
  ASSERT computedColor(element, withDarkModeCSS_fixed)
       === computedColor(element, withDarkModeCSS_original)
END FOR
```

---

### Unit Tests

**Bug 1:**
- Test `madeCount` value before and after `makeRecipe()` completes when `fetchSuggestions()` mock returns recipes with `made: false`
- Test `madeCount` value before and after `unmakeRecipe()` completes under the same mock
- Test `madeTotal` is correctly set when tab is `'made'` (equals `data.recipes.length`)
- Test `madeTotal` is not modified when fetching for the `'liked'` tab
- Test `madeTotal` floors at 0 when unmakeRecipe is called with madeTotal already 0

**Bugs 2 & 3:**
- Test that `html.ion-palette-dark .toggle-btn--active` resolves `color` to `#ffffff` in a JSDOM/CSS environment
- Test that `html.ion-palette-dark .toggle-btn--archived-active` resolves `color` to `#ffffff`
- Test that `html.ion-palette-dark .toggle-btn` (inactive, no active modifier) resolves `color` to `var(--dm-text-secondary)`
- Test that `html.ion-palette-dark .notif-header-title` resolves `color` to `var(--dm-text-primary)`
- Test that `.notif-header-title` without `html.ion-palette-dark` retains `color: #111827`

### Property-Based Tests

**Bug 1:**
- Generate random sequences of make/unmake operations on recipes with varying `activeTab` states. Assert that `madeCount` after each operation equals the expected count derived by independently tracking increments/decrements, regardless of what `fetchSuggestions` returns
- Generate random recipe arrays where some have `made: true` and some don't. Verify that initial load on `'all'` tab sets `madeTotal` to the correct count from `data.recipes.filter(r => r.made).length`

**Bugs 2 & 3:**
- Generate arbitrary combinations of dark mode on/off and button active/inactive states. Assert that the color rule applied always matches the expected value for each combination (dark + active → `#ffffff`; dark + inactive → `--dm-text-secondary`; light + any → scoped style)

### Integration Tests

**Bug 1:**
- Full E2E: Load recipes page, make a recipe, verify the badge count on the "Made" tab chip increments and does not flash to 0 during the refetch
- Full E2E: Switch to the "made" tab, unmake a recipe, verify the badge decrements and the tab chip updates correctly

**Bug 2:**
- Enable dark mode in settings, navigate to pantry, toggle between list/grid view, verify active toggle button text is white and clearly visible

**Bug 3:**
- Enable dark mode in settings, navigate to notifications, verify the "Notifications" toolbar title is visible (light-colored text)
