# Bugfix Requirements Document

## Introduction

The Home dashboard displays two statistic cards — "Pantry Items" and "Expiring Soon" — each showing a large numeric count (`.stat-value`) and a label (`.stat-label`). When dark mode is active, the dark card background (`#1e293b`) is correctly applied via `dark-mode.css`, but the stat value text retains its hardcoded near-black color (`#0f172a`) from the scoped component styles. This makes the count numbers invisible or near-invisible against the dark card surface. The same pattern may affect any other screen that renders a numeric metric or muted count value using a similarly hardcoded dark color without a dark-mode CSS override.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN dark mode is enabled AND the user views the Home dashboard THEN the system renders the "Pantry Items" count with near-black text (`#0f172a`) on a dark card background (`#1e293b`), making the number unreadable.

1.2 WHEN dark mode is enabled AND the user views the Home dashboard THEN the system renders the "Expiring Soon" count with near-black text (`#0f172a`) on a dark card background (`#1e293b`), making the number unreadable.

1.3 WHEN dark mode is enabled AND a `.stat-value` element (or equivalent muted numeric display on other screens) lacks a dark-mode text-color override THEN the system displays the hardcoded light-mode text color, causing the value to disappear against the dark card surface.

### Expected Behavior (Correct)

2.1 WHEN dark mode is enabled AND the user views the Home dashboard THEN the system SHALL render the "Pantry Items" count using a high-contrast light text color (e.g., `var(--dm-text-primary)`) that is clearly readable against the dark card background.

2.2 WHEN dark mode is enabled AND the user views the Home dashboard THEN the system SHALL render the "Expiring Soon" count using a high-contrast light text color (e.g., `var(--dm-text-primary)`) that is clearly readable against the dark card background.

2.3 WHEN dark mode is enabled AND any screen renders a `.stat-value` or equivalent numeric metric element THEN the system SHALL apply a dark-mode text-color override so that the value maintains sufficient contrast against the dark card background.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN dark mode is disabled (light mode) AND the user views the Home dashboard THEN the system SHALL CONTINUE TO render the "Pantry Items" count in the original near-black color (`#0f172a`) on the white card background.

3.2 WHEN dark mode is disabled (light mode) AND the user views the Home dashboard THEN the system SHALL CONTINUE TO render the "Expiring Soon" count in the original near-black color (`#0f172a`) on the white card background.

3.3 WHEN dark mode is enabled THEN the system SHALL CONTINUE TO display the correct numeric values (pantry item count and expiring-soon count) without any change to the underlying data or computed logic.

3.4 WHEN dark mode is enabled THEN the system SHALL CONTINUE TO display all other Home dashboard elements (greeting, section titles, expiring carousel, recipe cards, activity rows) with their existing dark-mode text and background styles unchanged.

3.5 WHEN dark mode is enabled AND the user views non-Home screens (Pantry, Profile, Settings, Notifications, etc.) THEN the system SHALL CONTINUE TO render those pages with their existing dark-mode overrides unchanged.
