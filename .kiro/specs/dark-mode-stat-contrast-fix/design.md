# Dark Mode Stat Contrast Fix — Bugfix Design

## Overview

The Home dashboard's statistic cards ("Pantry Items" and "Expiring Soon") become unreadable in dark mode. The `.stat-value` class in `HomePage.vue` hardcodes `color: #0f172a` — a near-black appropriate for light mode — but `dark-mode.css` only overrides the `.stat-card` background to `#1e293b` without providing a complementary text-color override for `.stat-value`. The result is near-black text on a dark slate card, making the counts invisible.

A secondary instance was audited on `PantryPage.vue` (`.scanned-stat-row__value`), where `dark-mode.css` already carries an override. The primary, unaddressed gap is the `.stat-value` selector in the Home dashboard. The fix is a single targeted CSS rule in `dark-mode.css` to restore contrast without touching component logic or data.

---

## Glossary

- **Bug_Condition (C)**: Dark mode is active AND the element bearing `.stat-value` is rendered, causing `color: #0f172a` (near-black) to appear against `var(--dm-bg-card)` (`#1e293b`).
- **Property (P)**: When the bug condition holds, the stat value text SHALL use a high-contrast light color (`var(--dm-text-primary)`, resolving to `#f1f5f9`) so the count is legible.
- **Preservation**: All light-mode rendering of `.stat-value` and every other dark-mode override already present in `dark-mode.css` must remain unchanged.
- **`dark-mode.css`**: The global stylesheet at `omniscan-ui/src/theme/dark-mode.css` that applies overrides under the `html.ion-palette-dark` scope.
- **`--dm-text-primary`**: CSS custom property defined as `#f1f5f9` in the `html.ion-palette-dark` token block — the canonical high-contrast text color for dark surfaces.
- **`ion-palette-dark`**: The class toggled on `document.documentElement` by `SettingsPage.vue` to activate dark mode app-wide.
- **Scoped styles**: Vue SFC `<style scoped>` rules that apply only within the component. Scoped rules can be overridden from a global stylesheet by targeting the same class name inside a higher-specificity selector (`html.ion-palette-dark .stat-value`).

---

## Bug Details

### Bug Condition

The bug manifests when `html.ion-palette-dark` is set AND any `.stat-value` element is in the DOM. The `dark-mode.css` override chain sets `.stat-card { background: var(--dm-bg-card) }` but leaves `.stat-value` inheriting or retaining its scoped `color: #0f172a`. There is no global rule to counteract the scoped value in dark mode.

**Formal Specification:**
```
FUNCTION isBugCondition(context)
  INPUT: context of type { darkModeActive: boolean, elementClass: string }
  OUTPUT: boolean

  RETURN context.darkModeActive = true
         AND context.elementClass = 'stat-value'
         AND NO dark-mode override exists for '.stat-value' in dark-mode.css
END FUNCTION
```

### Examples

- **Pantry Items count "2"**: In dark mode, renders as near-black `#0f172a` text on `#1e293b` card background — contrast ratio ~1.1:1, effectively invisible.
- **Expiring Soon count "1"**: Same rendering failure; a single-digit count that should be prominent disappears entirely.
- **Loading placeholder "—"**: The em-dash shown during the loading state also disappears due to the same class.
- **Edge case — count "0"**: Zero items displayed as a stat-value is equally invisible; not a data problem but a contrast failure.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Light mode rendering of `.stat-value` must continue using `color: #0f172a` on white card backgrounds — no changes to `HomePage.vue` scoped styles.
- All other dark-mode overrides already in `dark-mode.css` must remain exactly as they are; only an additive rule is introduced.
- The underlying pantry item count and expiring-soon count values (computed from API data) must not be affected in any way.
- All other Home dashboard elements — greeting text, section titles, expiring carousel cards, recipe cards, activity rows — must retain their current dark-mode appearance.
- Non-Home screens (Pantry, Profile, Settings, Notifications, etc.) must retain their existing dark-mode overrides unchanged.

**Scope:**
All inputs that do NOT involve the `.stat-value` class rendering under `html.ion-palette-dark` are completely unaffected. This includes:
- Mouse interactions with stat cards (navigation still works)
- Any other text element on the Home page
- Any screen outside `HomePage.vue`

---

## Hypothesized Root Cause

Based on the code audit, the root cause is confirmed (not merely hypothesized):

1. **Missing dark-mode override for `.stat-value`**: `dark-mode.css` overrides `.stat-card` background but omits a corresponding `.stat-value` text-color rule. This is an oversight — every other text element on the Home card (`.activity-name`, `.recipe-title`, `.expiring-name`, `.greeting-title`, `.section-title`) already has a dark-mode override in the same file.

2. **Vue scoped style isolation**: The `color: #0f172a` in `HomePage.vue`'s `<style scoped>` generates a component-scoped CSS attribute selector at runtime (e.g., `.stat-value[data-v-xxxxxx]`). A global `html.ion-palette-dark .stat-value` rule has sufficient specificity to override it because the `html.ion-palette-dark` prefix raises specificity above the component scope — confirmed by the pattern already used for `.activity-name`, `.recipe-title`, etc. in the same file.

3. **No fallback inheritance**: `.stat-value` has an explicit `color` declaration; it does not inherit from a parent element that receives a dark-mode color override, so inheritance cannot rescue it.

4. **Pantry page already addressed**: `PantryPage.vue` has `.scanned-stat-row__value { color: #0f172a }` with an identical pattern, but `dark-mode.css` already includes `html.ion-palette-dark .scanned-stat-row__value { color: var(--dm-text-primary) }`, confirming the fix pattern is established and correct.

---

## Correctness Properties

Property 1: Bug Condition — Stat Value Text Contrast in Dark Mode

_For any_ state where `html.ion-palette-dark` is active AND a `.stat-value` element is rendered on the Home dashboard, the fixed CSS SHALL apply `color: var(--dm-text-primary)` (`#f1f5f9`) to that element, ensuring the numeric count is legible against the dark card background (`#1e293b`), with a contrast ratio that meets WCAG AA (≥ 4.5:1 for normal text).

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Light Mode and Non-Stat-Value Elements Unchanged

_For any_ state where `html.ion-palette-dark` is NOT active (light mode), the fixed code SHALL produce exactly the same rendering as the original code — `.stat-value` retains `color: #0f172a` on a white card background, and no existing behavior is altered.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

---

## Fix Implementation

### Changes Required

**File**: `omniscan-ui/src/theme/dark-mode.css`

**Section**: Home stat cards (after the existing `.stat-card` background override in the "Cards and surface containers" block)

**Specific Changes**:

1. **Add `.stat-value` text-color override**: Insert the following rule into the "Cards and surface containers" section, immediately after the existing card background overrides:
   ```css
   html.ion-palette-dark .stat-value {
     color: var(--dm-text-primary, #f1f5f9) !important;
   }
   ```
   The `!important` flag matches the pattern used by adjacent overrides in the same file and ensures the rule wins over Vue's scoped attribute selector.

2. **No changes to `HomePage.vue`**: The scoped `color: #0f172a` on `.stat-value` is correct for light mode and must remain.

3. **No changes to any other file**: The fix is a single additive rule in the global dark-mode stylesheet.

4. **Audit confirmation**: `PantryPage.vue`'s `.scanned-stat-row__value` is already overridden in `dark-mode.css`; no additional change needed there. Admin views (`AdminDashboard.vue`, `AdminSystemLogs.vue`, `AdminManageUserProfile.vue`) use `.stat-value` with colored variants (green, orange, blue) and are not subject to the app-wide dark mode toggle — no changes needed.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on the unfixed code to confirm the root cause; then verify the fix restores contrast and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples demonstrating that `.stat-value` text is invisible in dark mode BEFORE the fix. Confirm that adding `html.ion-palette-dark` to `document.documentElement` while `.stat-value` is rendered produces near-zero contrast.

**Test Plan**: Write tests that add `ion-palette-dark` to the `html` element, mount `HomePage.vue` with mocked API data, and assert the computed text color of `.stat-value` elements. Run on the unfixed code to observe failures.

**Test Cases**:
1. **Pantry Items value visibility** — Mount with `pantryItemCount = 5`, activate dark mode, assert `.stat-value` computed color is NOT `#0f172a`. (Will fail on unfixed code.)
2. **Expiring Soon value visibility** — Mount with `expiringItems.length = 2`, activate dark mode, assert `.stat-value` computed color is NOT `#0f172a`. (Will fail on unfixed code.)
3. **Loading placeholder visibility** — During loading state (`isLoading = true`), activate dark mode, assert the "—" placeholder `.stat-value` is not near-black. (Will fail on unfixed code.)
4. **Edge case — zero count** — Mount with `pantryItemCount = 0`, activate dark mode, assert `.stat-value` computed color is readable. (Will fail on unfixed code.)

**Expected Counterexamples**:
- `getComputedStyle(statValueEl).color` returns `rgb(15, 23, 42)` (i.e., `#0f172a`) when `html.ion-palette-dark` is active.
- Possible causes: no override in `dark-mode.css`, or override specificity insufficient to beat Vue scoped selector.

### Fix Checking

**Goal**: Verify that after adding the `html.ion-palette-dark .stat-value` rule, all `.stat-value` elements in dark mode adopt `var(--dm-text-primary)`.

**Pseudocode:**
```
FOR ALL context WHERE isBugCondition(context) DO
  computedColor := getComputedStyle(statValueElement).color
  ASSERT computedColor = rgb(241, 245, 249)   -- #f1f5f9
END FOR
```

### Preservation Checking

**Goal**: Verify that for all states where dark mode is NOT active, `.stat-value` continues to render with `color: #0f172a`, and that no other dark-mode override is disturbed.

**Pseudocode:**
```
FOR ALL context WHERE NOT isBugCondition(context) DO
  ASSERT render(original_css) = render(fixed_css)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many input combinations (various pantry counts, loading states, mode states) automatically.
- It catches regressions across the full state space with minimal manual enumeration.
- It provides strong guarantees that light-mode rendering is bit-for-bit identical after the fix.

**Test Plan**: Capture light-mode computed styles for `.stat-value` on unfixed code, then verify they are unchanged on fixed code.

**Test Cases**:
1. **Light mode stat value color preservation** — In light mode, assert `.stat-value` computed color remains `rgb(15, 23, 42)` (`#0f172a`) after the fix is applied.
2. **Other dark-mode overrides untouched** — Activate dark mode and assert `.stat-card` background, `.activity-name` color, `.recipe-title` color, and `.greeting-title` color all remain their existing dark-mode values.
3. **Non-Home pages unaffected** — Mount `PantryPage.vue` in dark mode and assert `.scanned-stat-row__value` still resolves to `var(--dm-text-primary)` (unchanged by the new rule).

### Unit Tests

- Test that `.stat-value` in dark mode resolves to the `--dm-text-primary` value.
- Test that `.stat-value` in light mode resolves to `#0f172a`.
- Test the loading state (`—`) and zero-count edge case for both modes.
- Test that `.stat-label` color is unaffected by the fix (remains `#8e8e93` / `var(--dm-text-secondary)`).

### Property-Based Tests

- Generate arbitrary pantry item counts (0–999) and verify that in dark mode every `.stat-value` rendered on the Home dashboard has sufficient contrast against `var(--dm-bg-card)`.
- Generate arbitrary combinations of `darkModeActive` (true/false) and verify that the computed color for `.stat-value` matches the expected value for that mode in all cases.
- Generate random sets of dark-mode class toggles and verify no regression in the 10+ other overrides already present in `dark-mode.css`.

### Integration Tests

- Full Home page render in dark mode: verify both stat cards display visible numeric values with computed contrast ratio ≥ 4.5:1.
- Toggle dark mode on/off during app session and verify stat values switch color correctly in both directions.
- Navigate to Pantry, Profile, and Settings pages after the fix and verify no visual regressions introduced by the new rule.
