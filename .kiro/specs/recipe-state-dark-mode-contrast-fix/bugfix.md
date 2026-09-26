# Bugfix Requirements Document

## Introduction

Three distinct bugs are addressed in this document, all within the OmniScan Ionic Vue application:

1. **Recipe "Made" Badge Flash (RecipeSuggestions.vue)** — The "Made" tab badge count momentarily drops to zero or shows a stale value while `fetchSuggestions()` is in flight, because `madeCount` is a computed property derived from the live `recipes` array, which is cleared and repopulated on every fetch.

2. **Pantry Active/Archived Toggle Button Text Invisible in Dark Mode (PantryPage.vue + dark-mode.css)** — The active state of the Active and Archived toggle buttons loses its `#ffffff` text color in dark mode because the global `.toggle-btn` dark-mode override has higher effective specificity than the scoped active-state rules.

3. **Notifications Page Header Title Invisible in Dark Mode (NotificationsPage.vue + dark-mode.css)** — The `<ion-title>` inside the notifications toolbar uses a hardcoded near-black color (`#111827`) that is not overridden by the existing dark-mode rules, which target `.notif-title` (per-notification body text) rather than `.notif-header-title` (the toolbar title).

---

## Bug Analysis

### Current Behavior (Defect)

<!-- Bug 1: Recipe "Made" badge flash -->
1.1 WHEN a recipe fetch is in progress (isLoading is true) on any tab THEN the system displays a "Made" badge count of 0 because `madeCount` is recomputed from the momentarily-empty `recipes` array

1.2 WHEN `makeRecipe()` completes and calls `fetchSuggestions()` THEN the system resets the "Made" badge to 0 during the refetch, causing a visible count flash even though the number of made recipes has increased

1.3 WHEN `unmakeRecipe()` completes and calls `fetchSuggestions()` THEN the system resets the "Made" badge to 0 during the refetch rather than showing the decremented count

1.4 WHEN the "all" tab is active and the backend's `/api/recipes/suggest` endpoint returns recipes without `made: true` set THEN the system shows a "Made" badge count of 0 even if the user has previously made recipes

<!-- Bug 2: Pantry toggle dark mode -->
2.1 WHEN dark mode is active (`html.ion-palette-dark`) and the user views the Pantry page THEN the system renders the active toggle button (`.toggle-btn--active` or `.toggle-btn--archived-active`) with `var(--dm-text-secondary)` (#94a3b8) text color instead of white, making the label illegible against the button background

<!-- Bug 3: Notifications header dark mode -->
3.1 WHEN dark mode is active (`html.ion-palette-dark`) and the user opens the Notifications page THEN the system renders the page header title (`.notif-header-title`) with its hardcoded `#111827` color, making it nearly invisible against the dark toolbar background

---

### Expected Behavior (Correct)

<!-- Bug 1: Recipe "Made" badge flash -->
2.1 WHEN a recipe fetch is in progress on any tab THEN the system SHALL display the last known stable "Made" count in the badge rather than 0

2.2 WHEN `makeRecipe()` completes successfully THEN the system SHALL increment the stable "Made" count by 1 immediately, so the badge reflects the new count throughout the subsequent refetch

2.3 WHEN `unmakeRecipe()` completes successfully THEN the system SHALL decrement the stable "Made" count by 1 (minimum 0) immediately, so the badge reflects the updated count throughout the subsequent refetch

2.4 WHEN the "all" tab loads successfully THEN the system SHALL set the stable "Made" count to the number of recipes in the response where `made === true`

2.5 WHEN the "made" tab loads successfully THEN the system SHALL set the stable "Made" count to the total number of recipes returned (since every recipe in that response is a made recipe)

<!-- Bug 2: Pantry toggle dark mode -->
2.6 WHEN dark mode is active and the user views the Pantry page THEN the system SHALL render the active toggle button's label text in white (#ffffff) regardless of the global `.toggle-btn` dark-mode color override

<!-- Bug 3: Notifications header dark mode -->
2.7 WHEN dark mode is active and the user opens the Notifications page THEN the system SHALL render the page header title (`.notif-header-title`) using `var(--dm-text-primary)` (#f1f5f9) so it is legible against the dark toolbar background

---

### Unchanged Behavior (Regression Prevention)

<!-- Bug 1 preservation -->
3.1 WHEN the user is on the "all" tab and no fetch is in progress THEN the system SHALL CONTINUE TO compute `madeCount` from the recipes currently in the list

3.2 WHEN the user switches between tabs THEN the system SHALL CONTINUE TO show the correct recipe list for each tab after the fetch completes

3.3 WHEN the user toggles a like on a recipe THEN the system SHALL CONTINUE TO perform an optimistic update without affecting the "Made" badge count

<!-- Bug 2 preservation -->
3.4 WHEN the app is in light mode and the user views the Pantry page THEN the system SHALL CONTINUE TO display the active and inactive toggle buttons with their original scoped styles unchanged

3.5 WHEN dark mode is active and the toggle buttons are in their inactive state THEN the system SHALL CONTINUE TO render inactive button text using `var(--dm-text-secondary)` as before

<!-- Bug 3 preservation -->
3.6 WHEN the app is in light mode and the user opens the Notifications page THEN the system SHALL CONTINUE TO display the header title in `#111827` as defined in the component's scoped styles

3.7 WHEN dark mode is active and the user views per-notification body titles (`.notif-title`) THEN the system SHALL CONTINUE TO render those titles using `var(--dm-text-primary)` as already specified in dark-mode.css
