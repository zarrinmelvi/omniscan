# Admin Portal UI Fixes — Bugfix Design

## Overview

Four targeted, frontend-only fixes in `omniscan-ui/src/`. No backend changes.

| # | Item | File(s) touched |
|---|------|-----------------|
| 1 | Active tab renders white instead of green in `AdminSystemLogs.vue` | `AdminSystemLogs.vue` |
| 2 | Dark-mode coverage gaps in `AdminDashboard.vue` and `AdminSystemLogs.vue` | `theme/dark-mode.css` |
| 3 | Active-tab dark-mode overrides missing in `theme/dark-mode.css` | `theme/dark-mode.css` |
| 4 | AI Model input is editable; should be read-only | `AdminSettings.vue` |

Items 2 and 3 are both CSS-only edits to the same file and are applied together as a single append block.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs / render states that trigger each defect.
- **Property (P)**: The desired render or interaction outcome when C holds.
- **Preservation**: Existing light-mode styles and unrelated dark-mode rules that must remain untouched.
- **`--dm-*` tokens**: CSS custom properties declared in `dark-mode.css` (e.g. `--dm-bg-card`, `--dm-text-secondary`, `--dm-border`).
- **`ion-palette-dark`**: The class toggled on `<html>` to activate dark mode across the admin portal.
- **`tab-btn`**: The scoped button class used in `AdminSystemLogs.vue` tab bar.
- **`tab-button`**: The scoped button class used in `AdminSettings.vue` settings sidebar.

---

## Bug Details

### Item 1 — AdminSystemLogs active tab (wrong accent color)

The `.tab-btn.active` scoped rule in `AdminSystemLogs.vue` currently reads:

```css
.tab-btn.active {
  background: #ffffff;
  color: #0f172a;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
```

`AdminManageProductData.vue` and `AdminSettings.vue` both use `background: #008744; color: #ffffff` for their active states. `AdminSystemLogs.vue` was never updated to match.

**Formal Specification:**
```
FUNCTION isBugCondition_Item1(component, tabState)
  INPUT: component (string), tabState (active | inactive)
  OUTPUT: boolean

  RETURN component = "AdminSystemLogs" AND tabState = active
END FUNCTION
```

**Examples:**
- User clicks "API Latency" tab → active pill renders white with dark text (bug).
- User clicks "Overview" tab → same white rendering (bug on every active state).
- Inactive tabs render correctly as transparent with muted text (no bug).

---

### Item 2 — AdminDashboard dark-mode coverage gaps

`AdminDashboard.vue` uses several scoped class names that have no `html.ion-palette-dark` counterpart in `dark-mode.css`. The existing admin section covers `.system-logs`, `.settings-page`, and layout-shell classes, but the `.dashboard` root class and its child elements are absent.

**Formal Specification:**
```
FUNCTION isBugCondition_Item2(themeClass, component)
  INPUT: themeClass (string), component (string)
  OUTPUT: boolean

  RETURN themeClass = "ion-palette-dark"
         AND component IN ["AdminDashboard", "AdminSystemLogs"]
         AND cssOverrideExists(component, affectedClass) = false
END FUNCTION
```

**Affected classes confirmed from source:**

*AdminDashboard.vue scoped CSS — no dark override exists:*
- `.dashboard` — `background-color: #fafafa`
- `.stat-card` — `background` + border (each variant: `.green-card`, `.orange-card`, `.blue-card`)
- `.stat-label` — `color: #4b5563`
- `.stat-value` — inherits from card variant, needs primary text color override
- `.stat-footer-text` — `color: #2563eb` (link blue, too bright on dark)
- `th` (scoped to `.dashboard`) — `color: #6b7280`, `border-bottom: 1px solid #f3f4f6`
- `td` (scoped to `.dashboard`) — `border-bottom: 1px solid #f3f4f6`
- `.product-name` — `color: #111827` (already covered by generic `.product-name` rule ✓ — no change needed)
- `.recent-header h2` — `color: #111827`
- `.view-all-link` — `color: #16a34a` (readable green, but verify contrast on `--dm-bg-card`)
- `.status-badge.pending` — `background: #fef3c7; color: #92400e`
- `.status-badge.flagged` — not in source; `.status-badge.approved` and `.dismissed` exist
- `.empty-note` — `color: #6b7280`
- `.error` (dashboard context) — `color: #dc2626` (keep red but verify legibility)
- `.recent-section` — `background: white; border: 1px solid #e5e7eb`
- `.subtitle` — already covered by `html.ion-palette-dark .subtitle` at ~line 1004 ✓

*AdminSystemLogs.vue scoped CSS — not yet covered:*
- `.chart-header h2` — `color: #1e293b`
- `.chart-subtitle` — `color: #94a3b8` (light secondary; needs dark equivalent)
- `.stat-label` — covered by the new generic `.stat-label` rule added for dashboard ✓
- `.time-labels` — `color: #94a3b8` (same token; covered by `--dm-text-secondary`)
- `.alert-box` — `background: #fffbeb; border: 1px solid #fef08a; color: #854d0e`
- `.axis-label` SVG fill — `fill: #94a3b8` (acceptable; covered by `--dm-text-secondary` if mapped to fill)
- `.uptime-val` — `color: #334155`

**Formal Specification:**
```
FUNCTION isBugCondition_Item2_SystemLogs(themeClass, element)
  INPUT: themeClass (string), element (string)
  OUTPUT: boolean

  RETURN themeClass = "ion-palette-dark"
         AND element IN [".chart-header h2", ".chart-subtitle", ".alert-box", ".uptime-val"]
         AND darkOverrideExists(element) = false
END FUNCTION
```

---

### Item 3 — Dark-mode active-tab overrides missing

Two separate active-tab selectors are used across the admin portal:

1. `.tab-btn.active` — used by `AdminSystemLogs.vue` and `AdminManageProductData.vue`
2. `.tabs-bar .tab-button.active` — used by any component that puts `tab-button` inside a `tabs-bar` wrapper

The existing dark-mode rule for `.tab-btn.active` reads:
```css
html.ion-palette-dark .tab-btn.active {
  background: var(--dm-bg-subtle);
  color: var(--dm-text-primary);
}
```
This produces a muted grey active state instead of the intended vibrant green.

The `.tabs-bar .tab-button.active` selector has **no dark-mode rule at all**.

**Formal Specification:**
```
FUNCTION isBugCondition_Item3(themeClass, tabState, tabClass)
  INPUT: themeClass (string), tabState (active | inactive), tabClass (string)
  OUTPUT: boolean

  RETURN themeClass = "ion-palette-dark"
         AND tabState = active
         AND tabClass IN [".tab-btn", ".tabs-bar .tab-button"]
END FUNCTION
```

**Examples:**
- Dark mode ON, user clicks "Overview" tab in System Logs → grey pill (bug).
- Dark mode ON, user switches to AI Settings tab → no `.tabs-bar .tab-button.active` rule exists → inherits from non-dark rule inconsistently (bug).
- Dark mode ON, inactive tabs → render correctly with `--dm-bg-card` (no bug).

---

### Item 4 — AI Model field is editable

The `aiModel` input in `AdminSettings.vue` template:
```html
<input id="aiModel" v-model="form.aiModel" type="text" class="text-input" />
```
`v-model` creates a two-way binding, so any keystroke mutates `form.aiModel`. The field has no `readonly` attribute, no visual affordance, and no label indicating it is system-controlled.

**Formal Specification:**
```
FUNCTION isBugCondition_Item4(fieldId, userAction)
  INPUT: fieldId (string), userAction (type | read | submit)
  OUTPUT: boolean

  RETURN fieldId = "aiModel" AND userAction = type
END FUNCTION
```

**Examples:**
- User navigates to AI & Scanning tab → field shows "Ollama Pro", appears fully editable (bug).
- User types "gpt-4" into the field → `form.aiModel` becomes "gpt-4", saved on next Save (bug).
- User clicks Save without touching the field → `form.aiModel` is submitted unchanged (not a bug, but must remain true after fix).

---

## Expected Behavior

### Preservation Requirements

**Unchanged light-mode behavior:**
- All `.tab-btn` and `.tab-button` non-active states in light mode remain untouched.
- All `AdminDashboard.vue` and `AdminSystemLogs.vue` light-mode scoped CSS is not modified.
- `AdminManageProductData.vue` and `AdminSettings.vue` active-tab styles are not modified.

**Unchanged dark-mode behavior:**
- Existing `html.ion-palette-dark .tabs-bar .tab-button` (inactive) rule is not modified.
- Existing `html.ion-palette-dark .settings-tabs .tab-button` rules are not modified.
- All other admin dark-mode rules (layout shell, modals, tables, inputs) are not modified.
- The `.subtitle` generic override at ~line 1004 remains and continues to cover system logs subtitle.

**Unchanged settings form behavior:**
- All other `AdminSettings.vue` form fields continue to accept user input normally.
- The `aiModel` value is included in the `PUT /api/admin/settings` payload unchanged (readonly fields are still form-submitted).
- Form validation and save flow are unaffected.

**Scope statement:**
Any admin page not listed in this spec continues to render with its existing styles in both light and dark mode.

---

## Hypothesized Root Cause

**Item 1**: `AdminSystemLogs.vue` was built independently from the other admin tab components and its `.tab-btn.active` rule was never aligned with the portal's green accent convention.

**Item 2**: `AdminDashboard.vue` uses the `.dashboard` root class, which is not listed in the existing `html.ion-palette-dark` scaffold block. The dashboard was likely added after the initial dark-mode pass.

**Item 3**: The dark-mode override for `.tab-btn.active` was written conservatively (muted grey) and never updated to the green. The `.tabs-bar .tab-button.active` selector was simply omitted from the initial dark-mode pass.

**Item 4**: The AI model identifier is a backend-controlled constant (`"Ollama Pro"`). The input was created as a standard form field without a read-only constraint, likely as scaffolding that was never locked down.

---

## Correctness Properties

Property 1: Bug Condition — Active Tab Uses Green Accent

_For any_ tab button where `isBugCondition_Item1` returns true (component is `AdminSystemLogs`, tab is active), the rendered element SHALL have `background-color: #008744` and `color: #ffffff`, matching the green accent convention used across the portal.

**Validates: Requirements 2.1**

Property 2: Bug Condition — Dark-Mode Dashboard and System Logs Legibility

_For any_ dashboard or system-logs element where `isBugCondition_Item2` returns true (`ion-palette-dark` is active and the element's class has no dark override), the rendered element SHALL use dark-mode-appropriate colors drawn from the `--dm-*` token set so text and borders are legible against the dark surface.

**Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**

Property 3: Bug Condition — Dark-Mode Active Tab Uses Green Accent

_For any_ active tab button where `isBugCondition_Item3` returns true (`ion-palette-dark` is active and tab state is active), the rendered element SHALL have `background: #008744` and `color: #ffffff`.

**Validates: Requirements 3.3, 3.4**

Property 4: Bug Condition — AI Model Field Is Not Mutable

_For any_ user interaction where `isBugCondition_Item4` returns true (field is `aiModel`, action is `type`), the field SHALL ignore the input, `form.aiModel` SHALL remain unchanged, and the field SHALL have `readonly` rendered in the DOM.

**Validates: Requirements 4.3, 4.4, 4.5**

Property 5: Preservation — Non-Active Tabs, Light Mode, Other Settings Fields

_For any_ input where none of the four bug conditions hold (inactive tabs, light mode, non-aiModel fields), the fixed code SHALL produce exactly the same rendered output and behavior as the original code.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

---

## Fix Implementation

### Item 1 — `omniscan-ui/src/views/admin/AdminSystemLogs.vue`

**Section**: `<style scoped>` — `.tab-btn.active` rule

**Change**: Replace the existing active rule:
```css
/* BEFORE */
.tab-btn.active {
  background: #ffffff;
  color: #0f172a;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* AFTER */
.tab-btn.active {
  background: #008744;
  color: #ffffff;
  font-weight: 600;
  border-color: #008744;
}
```

All other `.tab-btn` rules (base, hover) are unchanged.

---

### Items 2 & 3 — `omniscan-ui/src/theme/dark-mode.css`

**Section**: Append to the end of the existing `/* ADMIN PORTAL DARK MODE */` block (after the last rule currently at the end of the file, i.e. after `.batch-toolbar`).

**New rules to append:**

```css
/* --- AdminDashboard dark-mode overrides (Item 2) --- */
html.ion-palette-dark .dashboard {
  background-color: var(--dm-bg-page);
  color: var(--dm-text-primary);
}
html.ion-palette-dark .dashboard h1 { color: var(--dm-text-primary); }
html.ion-palette-dark .dashboard h2 { color: var(--dm-text-primary); }

/* Stat cards */
html.ion-palette-dark .dashboard .stat-card {
  background: var(--dm-bg-card) !important;
  border-color: var(--dm-border) !important;
}
html.ion-palette-dark .dashboard .green-card { background-color: rgba(0, 135, 68, 0.1) !important; }
html.ion-palette-dark .dashboard .orange-card { background-color: rgba(234, 88, 12, 0.1) !important; }
html.ion-palette-dark .dashboard .blue-card { background-color: rgba(37, 99, 235, 0.1) !important; }

html.ion-palette-dark .stat-label { color: var(--dm-text-secondary) !important; }
html.ion-palette-dark .stat-value { color: var(--dm-text-primary); }
html.ion-palette-dark .stat-footer-text { color: var(--dm-text-secondary); }

/* Recent flagged items section */
html.ion-palette-dark .recent-section {
  background: var(--dm-bg-card) !important;
  border-color: var(--dm-border) !important;
}
html.ion-palette-dark .recent-header h2 { color: var(--dm-text-primary); }
html.ion-palette-dark .view-all-link { color: #4ade80; }

/* Dashboard table (scoped to .dashboard to avoid overriding other tables) */
html.ion-palette-dark .dashboard th {
  color: var(--dm-text-secondary) !important;
  border-bottom-color: var(--dm-border) !important;
  background: var(--dm-bg-subtle) !important;
}
html.ion-palette-dark .dashboard td {
  border-bottom-color: var(--dm-border) !important;
}

/* Status badges */
html.ion-palette-dark .status-badge.pending {
  background-color: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}
html.ion-palette-dark .status-badge.approved {
  background-color: rgba(16, 185, 129, 0.15);
  color: #4ade80;
}
html.ion-palette-dark .status-badge.dismissed {
  background-color: var(--dm-bg-subtle);
  color: var(--dm-text-secondary);
}

html.ion-palette-dark .dashboard .empty-note { color: var(--dm-text-secondary); }
html.ion-palette-dark .dashboard .error { color: #f87171; }

/* --- AdminSystemLogs additional dark-mode overrides (Item 2) --- */
html.ion-palette-dark .chart-header h2 { color: var(--dm-text-primary); }
html.ion-palette-dark .chart-subtitle { color: var(--dm-text-secondary); }
html.ion-palette-dark .time-labels { color: var(--dm-text-secondary); }
html.ion-palette-dark .alert-box {
  background-color: rgba(234, 179, 8, 0.1);
  border-color: rgba(234, 179, 8, 0.3);
  color: #fbbf24;
}
html.ion-palette-dark .uptime-val { color: var(--dm-text-primary); }

/* --- Active tab — green accent in dark mode (Items 2 & 3) --- */
/* Fix existing .tab-btn.active override (was: --dm-bg-subtle / muted grey) */
html.ion-palette-dark .tab-btn.active {
  background: #008744 !important;
  color: #ffffff !important;
  border-color: #008744 !important;
}
/* Add missing .tabs-bar .tab-button.active dark-mode rule */
html.ion-palette-dark .tabs-bar .tab-button.active {
  background: #008744;
  color: #ffffff;
  border-color: #008744;
}
```

**Selector scoping notes:**
- `.dashboard .stat-card` is scoped with `.dashboard` to avoid conflicting with the existing generic `html.ion-palette-dark .stat-card` rule (which targets System Logs stat cards). The generic rule already covers System Logs; the dashboard variant overrides the per-card tinted backgrounds.
- `.dashboard th` / `.dashboard td` use the `.dashboard` ancestor instead of a component-specific class name, which is safe because `AdminDashboard.vue`'s `<table>` is always inside `.dashboard`.
- `.stat-label` and `.stat-value` are written without a `.dashboard` ancestor so they also cover the identical class names in `AdminSystemLogs.vue`.

---

### Item 4 — `omniscan-ui/src/views/admin/AdminSettings.vue`

**Template change** — AI Model input, inside the `v-if="activeTab === 'ai'"` block:

```html
<!-- BEFORE -->
<input
  id="aiModel"
  v-model="form.aiModel"
  type="text"
  class="text-input"
/>

<!-- AFTER -->
<input
  id="aiModel"
  :value="form.aiModel"
  type="text"
  class="text-input readonly-field"
  readonly
/>
```

**Label change** — add a "system default" badge next to the label in the same `.setting-info` block:

```html
<!-- BEFORE -->
<label for="aiModel" class="setting-title">AI Model</label>

<!-- AFTER -->
<label for="aiModel" class="setting-title">
  AI Model <span class="field-locked-badge">system default</span>
</label>
```

**Scoped CSS addition** — append to `<style scoped>`:

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

**Dark-mode addition** — append to `dark-mode.css` (in the same edit as Items 2 & 3):

```css
html.ion-palette-dark .readonly-field {
  background: var(--dm-bg-subtle) !important;
}
html.ion-palette-dark .field-locked-badge {
  background: var(--dm-bg-subtle);
  color: var(--dm-text-secondary);
}
```

**Why `:value` not `v-model`**: `v-model` is syntactic sugar for `:value` + `@input`. Dropping `v-model` and using `:value` alone means the input never writes back to `form.aiModel` even if the `readonly` attribute were somehow stripped by developer tools. The `readonly` attribute provides the browser-enforced guard; removing `v-model` provides the Vue-level guard. Both together are defence-in-depth.

---

## Testing Strategy

### Validation Approach

Two-phase approach per item: first surface counterexamples on unfixed code to confirm root cause, then verify fix and preservation.

### Exploratory Bug Condition Checking

**Goal**: Observe each defect on the current unmodified code to confirm the root cause hypotheses.

**Plan by item:**

1. **Item 1 — Tab color**: Open `AdminSystemLogs.vue` in browser, click any tab → confirm active pill is white, not green.
2. **Item 2 — Dashboard dark mode**: Toggle dark mode ON via Settings, navigate to Dashboard → confirm `.stat-card` backgrounds are light, `.stat-label` text is dark-grey-on-dark, table headers/rows lack contrast.
3. **Item 3 — Active tab dark mode**: Dark mode ON, click a tab in System Logs → confirm grey pill. Navigate to Settings → confirm no `.tabs-bar .tab-button.active` rule in DevTools.
4. **Item 4 — AI Model editable**: Navigate to AI & Scanning settings tab → confirm field accepts keystrokes, `v-model` binding mutates `form.aiModel` (visible in Vue DevTools).

**Expected counterexamples:**
- Item 1: `background-color: rgb(255, 255, 255)` on `.tab-btn.active`.
- Item 2: `.stat-card` retains `#f2fbf5` / `#fffaf0` / `#f0f7ff` in dark mode.
- Item 3: `.tab-btn.active` computed style shows `background: var(--dm-bg-subtle)` (muted grey); `.tabs-bar .tab-button.active` has no matching dark rule.
- Item 4: `form.aiModel` in Vue DevTools changes when user types.

---

### Fix Checking

```
-- Item 1
FOR ALL tabs WHERE isBugCondition_Item1(component, tabState) DO
  result := render(tab)
  ASSERT result.backgroundColor = "#008744"
  ASSERT result.color = "#ffffff"
END FOR

-- Item 2
FOR ALL views WHERE isBugCondition_Item2(themeClass, component) DO
  rendered := render(view)
  ASSERT rendered[".stat-card"].backgroundColor ≠ lightModeDefault
  ASSERT rendered[".stat-label"].color = dm-text-secondary token value
  ASSERT rendered["th"].color = dm-text-secondary token value
  ASSERT rendered["td"].borderBottomColor = dm-border token value
  ASSERT rendered[".status-badge.pending"].backgroundColor uses rgba amber tint
END FOR

-- Item 3
FOR ALL tabs WHERE isBugCondition_Item3(themeClass, tabState, tabClass) DO
  result := render(tab)
  ASSERT result.backgroundColor = "#008744"
  ASSERT result.color = "#ffffff"
END FOR

-- Item 4
FOR ALL interactions WHERE isBugCondition_Item4(fieldId, userAction) DO
  interact(aiModelField, type, "gpt-4")
  ASSERT form.aiModel = "Ollama Pro"     -- unchanged
  ASSERT aiModelField.readOnly = true
END FOR
```

### Preservation Checking

```
FOR ALL inputs WHERE NOT anyBugConditionHolds(input) DO
  ASSERT render_fixed(input) = render_original(input)
END FOR
```

Concrete preservation checks:
- Light mode: all four components render identically before and after the fix.
- Dark mode, inactive tabs: `background: var(--dm-bg-card)` unchanged.
- Dark mode, other admin pages (Verification, Manage Product Data, Manage User Profiles): unchanged.
- `AdminSettings.vue` save flow: `form.aiModel` value is present in PUT payload.
- All other settings fields accept input normally.

---

### Unit Tests

- **Item 1**: Render `AdminSystemLogs.vue` via Vue Test Utils, click each tab, assert computed style `background-color === "#008744"` on `.tab-btn.active`.
- **Item 2**: Mount `AdminDashboard.vue` with `document.documentElement.classList.add("ion-palette-dark")`, assert key elements carry dark-mode class-level overrides (check presence of dark CSS rules via `getComputedStyle`).
- **Item 3**: Mount `AdminSystemLogs.vue` in dark mode, click a tab, assert `.tab-btn.active` computed background is `#008744`.
- **Item 4**: Mount `AdminSettings.vue`, navigate to `ai` tab, query `#aiModel`, assert `.readOnly === true` and that simulated `input` events do not change `form.aiModel`.

### Property-Based Tests

- **Item 4 preservation**: Generate random string values; for each, simulate typing into `#aiModel`; assert `form.aiModel` is always `"Ollama Pro"` regardless of input.
- **Item 1 & 3 — tab cycle**: For any sequence of tab IDs, assert only the last-clicked tab has `background: #008744` and all others have a non-green background.
- **Item 2 — token coverage**: For every class listed in the fix, generate a mock dark-mode document and assert that `getComputedStyle` returns a value derived from the `--dm-*` token, not a hardcoded light-mode hex.

### Integration Tests

- **Full dark-mode walkthrough**: Enable dark mode in Settings, navigate to Dashboard → System Logs → Settings AI tab; assert legibility at each step.
- **Tab navigation**: Click through all four System Logs tabs in both light and dark mode; assert active tab is always green.
- **Settings save**: Fill editable fields, leave AI Model untouched, save; assert PUT payload contains `aiModel: "Ollama Pro"`.
- **Read-only guard**: In AI & Scanning tab, attempt to type in the AI Model field; assert field value is unchanged and form submits correctly.
