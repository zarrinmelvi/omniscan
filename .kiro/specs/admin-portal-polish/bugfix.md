# Bugfix Requirements Document

## Introduction

This spec covers a combined bug-fix and feature-adjustment pass on the OmniScan admin portal (Ionic Vue frontend `omniscan-ui` + Nitro/H3 backend `nitro-app`, backed by Prisma/Neon). It builds on prior committed work and groups four related requirement areas:

1. **Persistent Dark Mode** across the Dashboard and Settings pages — fix a bug where toggling Dark Mode fails to persist and prematurely reverts to light mode on navigation.
2. **Harmonized Verification Panel color scheme** — enforce consistent color semantics across metric cards, table badges, and filter options.
3. **Detailed Review Modal** for Halal verification — consolidate the existing Review drawer and Correction modal into one modal with a hi-res zoomable image, full un-truncated AI notes, and an interactive certifying-body selector.
4. **Streamlined User Profile batch actions** — remove Archive and Delete from the batch toolbar, retaining only Send Inactivity Notice.

### Confirmed Decisions

- Keep the existing `.ion-palette-dark` class convention (applied on `<html>` / `document.documentElement`). Any mention of a `.dark` class refers generically to "the dark theme class."
- Standardize Verification Panel color semantics: **amber/yellow** = Unverified / Pending Review; **green** = Certified / Resolved; **red** = critical errors or blocked items only.
- Remove both Archive and Delete batch buttons from the Manage User Profiles toolbar to enforce automated PDPA/GDPR lifecycle policy.

### Flagged Default Assumptions (revisable by the user)

- **Assumption B — Theme source of truth.** localStorage (key `omniscan_dark_mode`) is the authoritative source for the live theme. Backend settings sync is best-effort and must never revert the applied theme on navigation. The reported revert bug is attributed to `fetchSettings()` in `AdminSettings.vue` calling `applyDarkMode(form.darkMode)` after `Object.assign(form, data)` overwrites the toggle with a stale or absent backend value.
- **Assumption C — Modal consolidation.** The separate Review drawer and Correction modal are consolidated into a single detailed review modal that opens on clicking [Review] or the flagged row. If you prefer to keep them as two distinct surfaces, this can be revised.

### Non-Goals

- No new backend endpoints are required. The work reuses existing endpoints: `GET /api/admin/flagged-scans/[id]`, the existing Halal Certifier Library / halal logo endpoint, and `POST /api/admin/users/batch`. The batch endpoint may retain archive/delete support server-side; the UI simply must not expose those actions.

## Bug Analysis

### Current Behavior (Defect)

**Dark Mode persistence**

1.1 WHEN a user toggles Dark Mode on in Admin Settings and then navigates to the Dashboard or back to Settings THEN the system prematurely reverts the applied theme to light mode.
1.2 WHEN `fetchSettings()` runs on the Settings page THEN the system overwrites the local dark-mode toggle with a stale or absent backend value via `Object.assign(form, data)` and then calls `applyDarkMode(form.darkMode)`, dropping the user's chosen theme.

**Verification Panel color semantics**

1.3 WHEN the Verification Panel renders its four metric cards THEN the system colors "Unverified Halal Logos" red, which conflicts with the semantic that red is reserved for critical or blocked items.
1.4 WHEN metric cards, table badges, and filter options represent the same state THEN the system uses colors inconsistently, so a given state can appear in different colors across the three surfaces.

**Halal review surfaces**

1.5 WHEN a reviewer opens a flagged scan THEN the system splits review context across a separate slide-in Review drawer and a separate Correction modal, requiring two surfaces to complete one review.
1.6 WHEN AI detection notes (`flag_reason` / `clean_flag_reason` / `ocr_flag_reason`) are displayed THEN the system truncates/clamps them, hiding full detection context.

**User Profile batch actions**

1.7 WHEN an admin selects users in Manage User Profiles THEN the system exposes "Archive" and "Delete" batch buttons, allowing manual lifecycle actions that conflict with the automated PDPA/GDPR lifecycle policy.

### Expected Behavior (Correct)

**Dark Mode persistence**

2.1 WHEN a user toggles Dark Mode on in Admin Settings and navigates to the Dashboard or back to Settings THEN the system SHALL retain the dark theme by keeping the `ion-palette-dark` class on `document.documentElement`.
2.2 WHEN `fetchSettings()` runs THEN the system SHALL treat localStorage (`omniscan_dark_mode`) as the source of truth and SHALL NOT revert the applied theme when the backend value is stale or absent; backend sync SHALL be best-effort only.

**Verification Panel color semantics**

2.3 WHEN the Verification Panel renders metric cards representing "Unverified / Pending Review" THEN the system SHALL color them amber/yellow, reserving red exclusively for critical errors or blocked items.
2.4 WHEN a state is shown as a metric card, a table badge, and a filter option THEN the system SHALL use the same color semantics across all three (amber/yellow = unverified/pending, green = certified/resolved, red = critical/blocked).

**Halal review surfaces**

2.5 WHEN a reviewer clicks [Review] or a flagged row THEN the system SHALL open a single detailed review modal containing the hi-res scanned package/logo image (zoomable), the full AI detection notes, and the interactive certifying-body selector.
2.6 WHEN AI detection notes are displayed in the modal THEN the system SHALL show `flag_reason`, `clean_flag_reason`, and `ocr_flag_reason` fully un-truncated (not clamped).

**User Profile batch actions**

2.7 WHEN an admin selects users in Manage User Profiles THEN the system SHALL present only "Send Inactivity Notice" as the batch action, with no Archive or Delete buttons in the toolbar.

### Unchanged Behavior (Regression Prevention)

**Dark Mode**

3.1 WHEN Dark Mode is off THEN the system SHALL CONTINUE TO render the admin portal in light mode.
3.2 WHEN the app boots THEN the system SHALL CONTINUE TO re-apply the persisted theme from localStorage in `App.vue` onMounted.
3.3 WHEN Dark Mode is applied THEN the system SHALL CONTINUE TO style `.admin-layout`, `.sidebar`, `.admin-main`, `.top-bar`, `.settings-page`, `.content-card`, `.settings-card`, `.data-table`, `.batch-toolbar`, and other admin surfaces via the existing global `html.ion-palette-dark` overrides in `theme/dark-mode.css`.

**Verification Panel**

3.4 WHEN "Certified / Resolved" items are shown THEN the system SHALL CONTINUE TO use green.
3.5 WHEN filters (All Halal Flags, All Verdicts, All Statuses) and helpers (`verdictClass`, `confidenceClass`, `statusClass`, `statusLabel`) are used THEN the system SHALL CONTINUE TO filter and label rows correctly.

**Halal review**

3.6 WHEN a reviewer certifies or dismisses a scan THEN the system SHALL CONTINUE TO support Certify & Resolve and Dismiss using the halal logo library (`halalLogos`, `modalSelectedLogoId`) via existing endpoints.
3.7 WHEN the modal loads scan detail THEN the system SHALL CONTINUE TO fetch from the existing `GET /api/admin/flagged-scans/[id]` endpoint, including images, OCR text, and user attribution.

**User Profiles**

3.8 WHEN "Send Inactivity Notice" is used THEN the system SHALL CONTINUE TO call `POST /api/admin/users/batch` with action `notify`.
3.9 WHEN the backend `POST /api/admin/users/batch` endpoint receives archive or delete actions THEN the system SHALL CONTINUE TO support them server-side (only the UI exposure is removed).

## Bug Condition Methodology

### Bug Condition — Dark Mode revert

```pascal
FUNCTION isBugCondition(X)
  INPUT: X = { darkModeEnabled: boolean, navigatedTo: Page, backendDarkMode: boolean | absent }
  OUTPUT: boolean

  // Bug triggers when dark mode is on locally but a settings fetch/navigation
  // reverts the applied theme using a stale or absent backend value.
  RETURN X.darkModeEnabled = true
     AND X.navigatedTo IN { Dashboard, Settings }
     AND X.backendDarkMode <> true
END FUNCTION
```

```pascal
// Property: Fix Checking — theme persistence
FOR ALL X WHERE isBugCondition(X) DO
  applyThemeAndNavigate'(X)
  ASSERT documentElement.hasClass("ion-palette-dark") = true
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT applyTheme(X) = applyTheme'(X)
END FOR
```

- **F**: current `fetchSettings()` that calls `applyDarkMode(form.darkMode)` after `Object.assign(form, data)`.
- **F'**: fixed flow that keeps localStorage as source of truth and does not revert the applied theme on stale/absent backend values.
- **Counterexample**: dark mode on, navigate to Dashboard, backend returns no `darkMode` → theme reverts to light.
