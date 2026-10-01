# Bugfix Requirements Document

## Introduction

This document covers four targeted UI bug fixes and adjustments in the admin portal of `omniscan-ui`. All changes are frontend-only in `omniscan-ui/src/`; no backend (`nitro-app`) changes are required. The four items are:

1. **Active tab state in `AdminSystemLogs.vue`** — active tab renders with a white background instead of the green accent used elsewhere in the admin portal.
2. **Dark-mode CSS coverage gaps in `AdminDashboard.vue` and `AdminSystemLogs.vue`** — multiple surface and text classes have no `html.ion-palette-dark` overrides, causing them to render with light-mode colors in dark mode.
3. **Missing dark-mode active-tab overrides in `theme/dark-mode.css`** — active tab states (`.tabs-bar .tab-button.active` and `.tab-btn.active`) are absent from the dark-mode stylesheet, so active tabs retain white backgrounds and dark text in dark mode.
4. **AI Model field is editable in `AdminSettings.vue`** — the "AI Model" input is a plain `<input type="text">` with no `readonly` constraint, allowing users to mutate a value that should be system-controlled.

### Non-Goals / Already Specced

- **Item 5 (AI web search fallback)** is explicitly out of scope for this spec; it will be addressed in a separate spec.
- **The dark-mode fetchSettings() revert bug** (where `fetchSettings()` clobbers the `localStorage` theme preference on page load) is already specced in `admin-portal-polish` (task 3.1). It is **not** re-specced here. The fixes in this spec assume that bug will be resolved by its own spec.

---

## Bug Analysis

### Current Behavior (Defect)

**Item 1 — AdminSystemLogs active tab (wrong accent color)**

1.1 WHEN a user clicks an active tab in `AdminSystemLogs.vue` THEN the system renders the active `.tab-btn` with a white background (`#ffffff`) and dark text, inconsistent with the green accent (`#008744`) used by active tabs in `AdminManageProductData.vue` and `AdminSettings.vue`.

**Item 2 — AdminDashboard dark-mode text legibility**

2.1 WHEN the `ion-palette-dark` class is active on `<html>` AND the user views `AdminDashboard.vue` THEN the system renders `.stat-label` text in `#4b5563` (dark grey, designed for a white background), making it nearly invisible against a dark surface.

2.2 WHEN the `ion-palette-dark` class is active AND the user views the dashboard stat cards THEN the system renders `.stat-card` with its light-mode background and border colors because no `html.ion-palette-dark .stat-card` override exists in `dark-mode.css`.

2.3 WHEN the `ion-palette-dark` class is active AND the user views the dashboard statistics table THEN the system renders `table th` text in `#6b7280` and `table td` row dividers in `#f3f4f6` (a near-white border), both of which are unreadable against a dark background.

2.4 WHEN the `ion-palette-dark` class is active AND the user views dashboard status badges THEN the system renders `.status-badge.*` variants with their light-mode color tokens because no dark-mode badge overrides exist in `dark-mode.css`.

2.5 WHEN the `ion-palette-dark` class is active AND the user views the dashboard subtitle area THEN the system renders `.subtitle` text in `#888` (light-mode grey) with no dark-mode override, degrading contrast against a dark surface.

**Item 3 — Dark-mode active tab overrides missing in theme/dark-mode.css**

3.1 WHEN the `ion-palette-dark` class is active AND a user selects an active tab using `.tabs-bar .tab-button.active` THEN the system applies the light-mode rule (`background: #008744; color: #fff`) without any dark-mode override, leaving the active tab visually inconsistent with dark-mode surface colors (the green pill remains but any surrounding component may conflict with the palette).

3.2 WHEN the `ion-palette-dark` class is active AND a user selects an active tab using `.tab-btn.active` (as in `AdminSystemLogs.vue`) THEN the system applies the white background (`#ffffff`) and dark text from the light-mode rule with no dark-mode override, making the active tab render as a stark white block on a dark surface.

**Item 4 — AI Model field is editable**

4.1 WHEN a user navigates to the AI Settings tab in `AdminSettings.vue` THEN the system renders the "AI Model" field as a standard editable `<input type="text">`, providing no visual or functional indication that the value is system-controlled and should not be changed.

4.2 WHEN a user types into the "AI Model" input field THEN the system accepts the input and updates `form.aiModel` via `v-model`, allowing a value to be submitted that was never intended to be user-configurable.

---

### Expected Behavior (Correct)

**Item 1 — AdminSystemLogs active tab (correct accent color)**

2.1 WHEN a user clicks a tab in `AdminSystemLogs.vue` THEN the system SHALL render the active `.tab-btn` with background `#008744` and text color `#ffffff`, consistent with active tab styles across all other admin portal tab components.

**Item 2 — AdminDashboard dark-mode text legibility**

2.2 WHEN the `ion-palette-dark` class is active AND the user views `AdminDashboard.vue` THEN the system SHALL render `.stat-label`, `.stat-value`, `.stat-footer-text`, `.subtitle`, `.product-name`, `.recent-header h2`, and `.view-all-link` using dark-mode-appropriate text colors that meet sufficient contrast against the dark surface.

2.3 WHEN the `ion-palette-dark` class is active AND the user views the dashboard stat cards THEN the system SHALL render `.stat-card` with a dark-mode background color and border color drawn from the established dark-mode design tokens (e.g., `var(--dm-bg-card)`, `var(--dm-border)`).

2.4 WHEN the `ion-palette-dark` class is active AND the user views the dashboard statistics table THEN the system SHALL render `table th` text and `table td` row dividers using dark-mode-appropriate colors so column headers and row separators are visible against the dark surface.

2.5 WHEN the `ion-palette-dark` class is active AND the user views dashboard status badges THEN the system SHALL render `.status-badge.*` variants with dark-mode-appropriate background and text color overrides so badge labels remain legible.

2.6 WHEN the `ion-palette-dark` class is active AND the user views `AdminSystemLogs.vue` THEN the system SHALL render `.chart-header h2`, `.chart-subtitle`, `.stat-label`, and `.stat-value` text elements using dark-mode-appropriate colors drawn from the dark-mode design tokens.

**Item 3 — Dark-mode active tab overrides in theme/dark-mode.css**

3.3 WHEN the `ion-palette-dark` class is active AND a user selects an active tab using `.tabs-bar .tab-button.active` THEN the system SHALL apply an explicit `html.ion-palette-dark .tabs-bar .tab-button.active` rule in `dark-mode.css` with `background: #008744` (or an equivalent dark-mode-compatible vibrant green) and `color: #ffffff` so the active tab is clearly distinguishable on a dark surface.

3.4 WHEN the `ion-palette-dark` class is active AND a user selects an active tab using `.tab-btn.active` THEN the system SHALL apply an explicit `html.ion-palette-dark .tab-btn.active` rule in `dark-mode.css` with `background: #008744` and `color: #ffffff`, replacing the white-background light-mode rule and making the active tab readable on a dark surface.

**Item 4 — AI Model field is read-only**

4.3 WHEN a user navigates to the AI Settings tab in `AdminSettings.vue` THEN the system SHALL render the "AI Model" input with a `readonly` attribute so the field is focusable and its value is submitted with the form, but the value cannot be altered by user input.

4.4 WHEN the "AI Model" input is rendered THEN the system SHALL provide a visual affordance (e.g., a `readonly-field` CSS class, reduced opacity, or a lock icon) that communicates to the user that the field is not editable.

4.5 WHEN a user attempts to type into the "AI Model" input THEN the system SHALL ignore the input and preserve the existing value (`"Ollama Pro"` by default), preventing accidental or deliberate mutation of the system-controlled model identifier.

---

### Unchanged Behavior (Regression Prevention)

**Item 1 — AdminSystemLogs active tab**

3.1 WHEN a user views inactive tabs in `AdminSystemLogs.vue` THEN the system SHALL CONTINUE TO render `.tab-btn` (non-active) with their existing dark-mode and light-mode styles unchanged (background from `var(--dm-bg-card)`, color from `var(--dm-text-secondary)` in dark mode).

3.2 WHEN a user views `AdminManageProductData.vue` or `AdminSettings.vue` THEN the system SHALL CONTINUE TO render active and inactive tab states using their existing styles, which are not modified by this fix.

**Item 2 & 3 — Dark-mode CSS**

3.3 WHEN the `ion-palette-dark` class is NOT active THEN the system SHALL CONTINUE TO render all `AdminDashboard.vue` and `AdminSystemLogs.vue` classes (`.stat-card`, `.stat-label`, `table th`, `table td`, `.status-badge.*`, etc.) with their existing light-mode colors, which are not modified by this fix.

3.4 WHEN the `ion-palette-dark` class is active AND a user views `AdminLayout.vue` THEN the system SHALL CONTINUE TO render `.nav-item.active` with `background: #008744` and `color: #ffffff`, as the sidebar active state is already correct and is not touched by this fix.

3.5 WHEN the `ion-palette-dark` class is active AND a user views any admin page not listed in this spec THEN the system SHALL CONTINUE TO render those pages with their existing dark-mode styles, which are not modified by this fix.

**Item 4 — AI Model field**

3.6 WHEN a user edits any other field in `AdminSettings.vue` (e.g., app name, language, notification toggles) THEN the system SHALL CONTINUE TO accept user input and update the corresponding `form.*` binding normally.

3.7 WHEN a user saves the settings form in `AdminSettings.vue` THEN the system SHALL CONTINUE TO submit all other form values as before; the `aiModel` field value SHALL be included in the submission payload unchanged (because `readonly` preserves the value for form submission).

---

## Bug Condition Pseudocode

### Item 1 — AdminSystemLogs active tab color

```pascal
FUNCTION isBugCondition_Item1(component, tabState)
  INPUT: component name (string), tabState (active | inactive)
  OUTPUT: boolean

  RETURN component = "AdminSystemLogs" AND tabState = active
END FUNCTION

// Property: Fix Checking
FOR ALL tabs WHERE isBugCondition_Item1(component, tabState) DO
  rendered ← render(tab)
  ASSERT rendered.backgroundColor = "#008744"
  ASSERT rendered.color = "#ffffff"
END FOR

// Property: Preservation Checking
FOR ALL tabs WHERE NOT isBugCondition_Item1(component, tabState) DO
  ASSERT render'(tab) = render(tab)
END FOR
```

### Item 2 — AdminDashboard dark-mode legibility

```pascal
FUNCTION isBugCondition_Item2(themeClass, component)
  INPUT: themeClass (string), component name (string)
  OUTPUT: boolean

  RETURN themeClass = "ion-palette-dark" AND component = "AdminDashboard"
END FUNCTION

// Property: Fix Checking
FOR ALL views WHERE isBugCondition_Item2(themeClass, component) DO
  rendered ← render(view)
  ASSERT rendered[".stat-card"].backgroundColor ≠ lightModeDefault
  ASSERT rendered[".stat-label"].color meets dark-surface contrast
  ASSERT rendered["table th"].color meets dark-surface contrast
  ASSERT rendered["table td"].borderColor ≠ "#f3f4f6"
END FOR

// Property: Preservation Checking
FOR ALL views WHERE NOT isBugCondition_Item2(themeClass, component) DO
  ASSERT render'(view) = render(view)
END FOR
```

### Item 3 — Dark-mode active tab overrides

```pascal
FUNCTION isBugCondition_Item3(themeClass, tabState)
  INPUT: themeClass (string), tabState (active | inactive)
  OUTPUT: boolean

  RETURN themeClass = "ion-palette-dark" AND tabState = active
END FUNCTION

// Property: Fix Checking
FOR ALL tabs WHERE isBugCondition_Item3(themeClass, tabState) DO
  rendered ← render(tab)
  ASSERT rendered.backgroundColor = "#008744"
  ASSERT rendered.color = "#ffffff"
END FOR

// Property: Preservation Checking
FOR ALL tabs WHERE NOT isBugCondition_Item3(themeClass, tabState) DO
  ASSERT render'(tab) = render(tab)
END FOR
```

### Item 4 — AI Model field read-only

```pascal
FUNCTION isBugCondition_Item4(fieldId, userAction)
  INPUT: fieldId (string), userAction (type | read | submit)
  OUTPUT: boolean

  RETURN fieldId = "aiModel" AND userAction = type
END FUNCTION

// Property: Fix Checking
FOR ALL interactions WHERE isBugCondition_Item4(fieldId, userAction) DO
  result ← interact(aiModelField, userAction)
  ASSERT form.aiModel UNCHANGED
  ASSERT aiModelField.readonly = true
END FOR

// Property: Preservation Checking
FOR ALL fields WHERE NOT isBugCondition_Item4(fieldId, userAction) DO
  ASSERT interact'(field, userAction) = interact(field, userAction)
END FOR
```
