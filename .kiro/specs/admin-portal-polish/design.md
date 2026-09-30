# Admin Portal Polish Bugfix Design

## Overview

This design covers four related fixes/adjustments on the OmniScan admin portal, all confined to the `omniscan-ui` (Ionic Vue) frontend. No `nitro-app` backend changes are required — every area reuses existing endpoints.

1. **Dark Mode persistence** — a settings load clobbers the user's applied theme. The root cause is `fetchSettings()` in `AdminSettings.vue` running `applyDarkMode(form.darkMode)` after `Object.assign(form, data)` has already overwritten `form.darkMode` with a stale or absent backend value. The fix makes localStorage (`omniscan_dark_mode`) the authoritative source for the live theme; backend sync stays best-effort and must never downgrade the applied theme on load.
2. **Verification Panel color harmonization** — the "Unverified Halal Logos" metric card is red, which contradicts the semantic that red is reserved for critical/blocked items. The fix recolors cards and aligns card / badge / filter colors to one semantic token set (amber-yellow = unverified/pending, green = certified/resolved, red = critical/blocked only).
3. **Detailed Review Modal** — the review experience is split across a slide-in Review drawer and a separate Correction modal. The fix consolidates them into a single modal (opened from the [Review] button or a flagged-row click) containing the hi-res zoomable image, fully un-truncated AI notes, and the interactive certifying-body selector with Certify & Resolve / Dismiss.
4. **Batch actions streamlining** — the Manage User Profiles batch toolbar exposes Archive and Delete. The fix removes those two buttons, leaving only Send Inactivity Notice; the backend `POST /api/admin/users/batch` remains unchanged and still supports all three actions server-side.

The general strategy is minimal, targeted, frontend-only changes that preserve all non-buggy behavior. Verification uses `vue-tsc --noEmit` for type checking (the terminal is flaky, so type checking is the primary automated gate) plus manual/behavioral verification of each area.

## Glossary

- **Bug_Condition (C)**: The set of inputs that trigger a defect (e.g., dark mode on locally but a settings load reverts the applied theme; a metric/badge/filter whose color contradicts the shared semantics; a reviewer opening a flagged scan across two surfaces; a batch selection exposing Archive/Delete).
- **Property (P)**: The desired correct behavior for inputs where C holds (theme stays dark; colors follow the semantic table; a single modal presents image + un-truncated notes + selector; only Send Inactivity Notice is offered).
- **Preservation**: Existing behaviors that must remain unchanged for inputs where C does NOT hold (light mode when off, app-boot theme re-apply, green for certified, existing filter/label helpers, certify/dismiss via existing endpoints, `POST /api/admin/users/batch` server-side support).
- **`applyDarkMode(enabled)`**: Function in `AdminSettings.vue` that toggles `document.documentElement.classList.toggle('ion-palette-dark', enabled)` and writes `localStorage[DARK_MODE_KEY]`.
- **`DARK_MODE_KEY`**: The localStorage key `'omniscan_dark_mode'`, the source of truth for the live theme.
- **`fetchSettings()`**: Function in `AdminSettings.vue` that GETs `/api/admin/settings`, merges the response via `Object.assign(form, data)`, and (currently) re-applies dark mode from the merged value — the revert bug.
- **`ion-palette-dark`**: The global dark-theme class applied on `document.documentElement` (`<html>`), styled by `theme/dark-mode.css`.
- **`verdictClass` / `confidenceClass` / `statusClass`**: Helpers in `VerificationPanel.vue` returning color-semantic class names for badges, confidence text, and status pills.
- **Review drawer / Correction modal**: The two existing review surfaces in `VerificationPanel.vue` being consolidated into one modal.
- **`runBatch(action)`**: Function in `AdminManageUserProfile.vue` that POSTs the selected user IDs and an action (`'notify' | 'archive' | 'delete'`) to `/api/admin/users/batch`.

## Bug Details

### Bug Condition

The primary bug (dark mode revert) manifests when Dark Mode is enabled locally but a settings load or navigation reverts the applied theme, because `fetchSettings()` re-applies dark mode from a backend value that is stale or absent after `Object.assign(form, data)`. The remaining three areas are behavioral/UI-consistency adjustments expressed through the same bug-condition lens (color semantics contradiction, split review surfaces, exposed destructive batch actions).

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type SettingsLoadEvent
         { darkModeEnabled: boolean,          // localStorage omniscan_dark_mode === 'true'
           navigatedTo: Page,                 // Dashboard | Settings
           backendDarkMode: boolean | absent } // form.darkMode after Object.assign(form, data)
  OUTPUT: boolean

  RETURN input.darkModeEnabled = true
         AND input.navigatedTo IN { Dashboard, Settings }
         AND input.backendDarkMode <> true   // stale-false or absent
END FUNCTION
```

Supporting bug conditions for the other three areas:
```
// Area 2 — color semantics contradiction
FUNCTION isColorBug(surface)
  RETURN surface.state = "Unverified/Pending"
         AND surface.color = "red"           // red must be reserved for critical/blocked
      OR (sameState(a, b) AND a.color <> b.color)  // card vs badge vs filter mismatch
END FUNCTION

// Area 3 — split review surfaces / truncated notes
FUNCTION isReviewBug(interaction)
  RETURN interaction = "review flagged scan"
         AND (surfacesNeeded > 1 OR notesTruncated = true)
END FUNCTION

// Area 4 — exposed destructive batch actions
FUNCTION isBatchBug(toolbar)
  RETURN toolbar.exposes("archive") OR toolbar.exposes("delete")
END FUNCTION
```

### Examples

- **Dark mode revert**: Toggle Dark Mode on in Settings → navigate to Dashboard → return to Settings. `fetchSettings()` runs, backend returns no `darkMode` (or `false`); `Object.assign(form, data)` sets `form.darkMode = false`; `applyDarkMode(false)` removes `ion-palette-dark`. Expected: theme stays dark. Actual: reverts to light.
- **Color contradiction**: The "Unverified Halal Logos" card (`counts.total`) is styled `.summary-card.red` with `.red-text`, implying a critical error for what is simply the unverified backlog. Expected: amber/yellow.
- **Split review**: Reviewer clicks [Review] → drawer opens with images/notes → must then click "Open Correction Modal" to assign a certifier. Expected: one modal does both.
- **Truncated notes**: `.ocr-text` has `max-height: 160px; overflow-y: auto`, clamping long OCR content. Expected: full notes visible (scroll acceptable but not clamped away; use `pre-wrap` and remove the height cap in the modal context).
- **Exposed destructive actions**: Selecting users shows Archive and Delete buttons. Expected: only Send Inactivity Notice.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Light mode continues to render when Dark Mode is off (`ion-palette-dark` absent).
- `App.vue` `onMounted` continues to re-apply the persisted theme from localStorage on every app boot.
- Existing `theme/dark-mode.css` `html.ion-palette-dark` overrides continue to style admin surfaces (`.admin-layout`, `.sidebar`, `.admin-main`, `.top-bar`, `.settings-page`, `.content-card`, `.settings-card`, `.data-table`, `.batch-toolbar`, etc.). No structural CSS change unless a surface is found missing a dark rule.
- The Dashboard retains the theme purely via the persistent `<html>.ion-palette-dark` class — no per-view dark-mode logic exists or is added there.
- "Certified / Resolved" continues to use green.
- Verification Panel filters (All Halal Flags, All Verdicts, All Statuses) and helpers (`verdictClass`, `confidenceClass`, `statusClass`, `statusLabel`, `halalFlagLabel`, `filteredRows`, `counts`) continue to filter and label rows correctly.
- Certify & Resolve and Dismiss continue to work using the halal logo library (`halalLogos`, `modalSelectedLogoId`) via existing endpoints.
- The modal continues to load scan detail from `GET /api/admin/flagged-scans/[id]` (images, OCR text, user attribution).
- Send Inactivity Notice continues to call `POST /api/admin/users/batch` with action `notify`.
- The backend `POST /api/admin/users/batch` continues to support archive and delete server-side; only UI exposure is removed.

**Scope:**
All inputs where the bug condition does NOT hold must be unaffected:
- Dark Mode OFF flows, other keyboard/mouse interactions, and all non-settings pages.
- The green "Certified / Resolved" semantic and all row filtering/labeling.
- Certify/dismiss request payloads and endpoints.
- The `notify` batch path and server-side batch capabilities.

## Hypothesized Root Cause

1. **Dark Mode — backend value clobbers local theme (confirmed)**: In `fetchSettings()`, `Object.assign(form, data)` overwrites `form.darkMode` with the backend value, then `applyDarkMode(form.darkMode)` applies that (stale/absent → falsy) value, removing `ion-palette-dark`. localStorage was already correct (seeded in `onMounted` and honored by `App.vue`), but the load path downgrades it.

2. **Color semantics — red misused for backlog**: `.summary-card.red` / `.red-text` are attached to the "Unverified Halal Logos" (total) card in the template, and the token families across `.summary-card.*`, `.pill-*`, `.conf-*`, and `.flag-capsule.*` are not aligned to a single semantic mapping, so the same state can read differently across card / badge / filter.

3. **Review split — two containers by design**: A `reviewDetail`-driven drawer and a `modalRow`-driven modal are separate surfaces, with a manual "Open Correction Modal" bridge. Notes are clamped by `.ocr-text { max-height:160px; overflow-y:auto }` and rely on `.flag-reason-text` (currently un-clamped but must stay full and wrap).

4. **Batch actions — destructive buttons present in template**: `.batch-buttons` renders three `<button>`s; `runBatch` includes `archive`/`delete` branches with `window.confirm`. Removing the buttons removes the UI path; the function branches become unreachable dead code.

## Correctness Properties

Property 1: Bug Condition - Dark Mode Persists Across Load and Navigation

_For any_ input where the bug condition holds (isBugCondition returns true — dark mode enabled locally, navigating to Dashboard/Settings, backend value stale or absent), the fixed `fetchSettings()` flow SHALL keep `document.documentElement` carrying the `ion-palette-dark` class, treating localStorage (`omniscan_dark_mode`) as the source of truth and never downgrading the applied theme from a stale/absent backend value.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Non-Buggy Theme and Panel Behavior

_For any_ input where the bug condition does NOT hold (isBugCondition returns false — dark mode off, or backend value already true, or non-affected surfaces), the fixed code SHALL produce the same result as the original: light mode when off, app-boot re-apply from localStorage, green for certified/resolved, and correct filtering/labeling via the existing helpers.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

Property 3: Color Semantics - Consistent Across Card, Badge, and Filter

_For any_ state rendered as a metric card, a table badge, and a filter option, the fixed styling SHALL use the same semantic color (amber/yellow = unverified/pending, green = certified/resolved, red = critical/blocked only), with red removed from the "Unverified Halal Logos" (total) card.

**Validates: Requirements 2.3, 2.4**

Property 4: Detailed Review Modal - Single Surface, Un-truncated Notes

_For any_ flagged scan opened via the [Review] button or a row click, the fixed panel SHALL open one modal presenting the hi-res zoomable image, fully un-truncated `flag_reason` / `clean_flag_reason` / `ocr_flag_reason`, and the interactive certifying-body selector with Certify & Resolve / Dismiss — reusing `GET /api/admin/flagged-scans/[id]` and preserving loading state.

**Validates: Requirements 2.5, 2.6, 3.6, 3.7**

Property 5: Batch Toolbar - Only Send Inactivity Notice

_For any_ non-empty user selection, the fixed batch toolbar SHALL present only the Send Inactivity Notice action (no Archive, no Delete), while `POST /api/admin/users/batch` continues to support all three actions server-side.

**Validates: Requirements 2.7, 3.8, 3.9**

## Fix Implementation

### Architecture — Files Changed and How

All changes are frontend-only, in `omniscan-ui/src/`:

| File | Change |
|------|--------|
| `views/admin/AdminSettings.vue` | Fix `fetchSettings()` so the backend load cannot downgrade the localStorage-derived theme. `handleSave` still PUTs `form.darkMode` (best-effort). |
| `views/admin/VerificationPanel.vue` | Recolor metric cards; align `.summary-card.*` / `.pill-*` / `.conf-*` / `.flag-capsule.*` to one semantic token set; consolidate Review drawer + Correction modal into one modal; un-truncate AI/OCR notes; keep lightbox. |
| `views/admin/AdminManageUserProfile.vue` | Remove Archive and Delete `<button>`s from `.batch-buttons`; simplify `runBatch`; optionally remove `.batch-btn.archive` / `.batch-btn.delete` CSS. |
| `App.vue` | No change — boot re-apply of theme from localStorage is preserved as-is and called out as a preservation guarantee. |
| `theme/dark-mode.css` | No structural change unless a surface is found missing a dark rule during verification. |

No `nitro-app` changes.

### 1. Dark Mode (`AdminSettings.vue`)

**Function**: `fetchSettings()`

**Specific Changes**:
1. **Preserve the local theme through the merge**: Capture the authoritative dark-mode value from localStorage before merging, then ensure the merge does not overwrite it. Preferred approach — exclude `darkMode` from the backend merge:
   ```ts
   const localDarkMode = localStorage.getItem(DARK_MODE_KEY) === 'true'
   const data = await apiFetch<Partial<typeof form>>('/api/admin/settings', { method: 'GET', isAdmin: true })
   Object.assign(form, data)
   // localStorage is the source of truth for the live theme; never let a stale/absent
   // backend value downgrade the applied theme on load.
   form.darkMode = localDarkMode
   applyDarkMode(form.darkMode)
   ```
   (Equivalently: `delete (data as any).darkMode` before `Object.assign`, then `applyDarkMode(localDarkMode)`.)
2. **Keep `applyDarkMode` reading the reconciled value**: It now always applies the localStorage-true value, so the theme is idempotently re-affirmed on load rather than reverted.
3. **`handleSave` unchanged (best-effort persist)**: Continue PUTting the full `form` (including `form.darkMode`) to `/api/admin/settings`. The save writes the user's choice back to the backend, but load reconciliation guarantees the backend can never win over localStorage for the live theme.
4. **`watch(() => form.darkMode, applyDarkMode)` unchanged**: Live-apply on toggle is preserved; because `fetchSettings` now sets `form.darkMode` to the local value, the watcher does not fire a spurious revert.
5. **`onMounted` unchanged**: Continues to seed `form.darkMode` from localStorage before calling `fetchSettings()`.
6. **Dashboard note**: The Dashboard needs no per-view logic; it inherits the theme from the persistent `<html>.ion-palette-dark` class kept by `App.vue`'s boot re-apply and never removed by the fixed load path.

### 2. Verification Panel Colors (`VerificationPanel.vue`)

**Semantic Color Table (single source of truth):**

| State | Color family | Card | Badge / Pill | Filter option | Confidence |
|-------|-------------|------|--------------|---------------|------------|
| Unverified / Pending Review | Amber-yellow | `.summary-card.yellow` — "Unverified Halal Logos", "Pending Halal Review" | `.pill-pending`, `.pill-flagged`, `.flag-capsule.yellow` | Verdict "Yellow" (pending/unverified); Status Pending/Flagged | `.conf-yellow` |
| Certified / Resolved | Green | `.summary-card.green` — "Certified / Resolved" | `.pill-approved`, `.flag-capsule` green context | Status Certified | `.conf-green` |
| Informational (corrections count) | Blue (neutral/informational) | `.summary-card.blue` — "Logo Corrections" | n/a | n/a | n/a |
| Dismissed | Neutral / grey | n/a | `.pill-dismissed` | Status Dismissed | n/a |
| Critical / Blocked | Red | reserved — not used for the total/backlog card | `.flag-capsule.red` only for a true blocked/critical verdict | Verdict "Red" (critical/blocked) | `.conf-red` for genuinely critical only |

**Specific Changes**:
1. **Recolor the total card**: Change the "Unverified Halal Logos" card from `.summary-card.red` + `.red-bg` + `.red-text` to the yellow family (`.summary-card.yellow` / `.yellow-bg` / `.yellow-text`), matching "Pending Halal Review". This removes red from the backlog metric.
2. **Keep "Pending Halal Review"** yellow (unchanged) and **"Certified / Resolved"** green (unchanged, preservation 3.4).
3. **"Logo Corrections" stays blue** as an informational tone. Rationale: blue is neither a status semantic (pending/certified/dismissed) nor red, so it does not conflict with the red-reserved rule. (A neutral slate is an acceptable alternative; recommendation is to keep blue as informational to avoid churn.)
4. **Harmonize helper output to the table**:
   - `verdictClass` — continue returning `'red' | 'yellow'`, but ensure `red` is only produced for a genuinely critical/blocked verdict (`safety_verdict === 'red'`); everything else is `yellow` (pending/unverified). No logic change is required if the data already reserves `red` for critical; the class-to-color mapping is what must align.
   - `confidenceClass` — keep `conf-red | conf-yellow | conf-green`, ensuring `conf-red` reads as "critical" not "high backlog". (Behavioral thresholds preserved per 3.5; only ensure the token colors match the table.)
   - `statusClass` — `pill-pending`/`pill-flagged` = amber-yellow, `pill-approved` = green, `pill-dismissed` = neutral/grey. Current CSS already matches this; verify tokens are shared/consistent.
5. **Unify the token set**: Ensure `.summary-card.yellow`, `.pill-pending`, `.pill-flagged`, `.flag-capsule.yellow`, and `.conf-yellow` draw from the same amber palette; `.summary-card.green`, `.pill-approved`, `.conf-green` from the same green; and any `.red` token from the same critical-red palette — so cards, badges, and the Verdict filter affordance read the same semantics.
6. **Verdict filter**: Keep the Red / Yellow options; their meaning aligns to the table (Red = critical/blocked, Yellow = pending/unverified). No option changes; filtering logic preserved (3.5).

### 3. Detailed Review Modal (`VerificationPanel.vue`)

**Consolidation approach**: Keep a single modal-style container (retire the drawer markup). Fold the drawer's read-only detail sections and the correction actions/selector into one modal, opened by clicking [Review] or the flagged row.

**Specific Changes**:
1. **Single open path**: Clicking [Review] OR clicking the row loads detail via existing `GET /api/admin/flagged-scans/${id}` (reuse `openReviewDrawer` logic, renamed conceptually to open the unified modal) and preserves `reviewLoadingId` loading state.
2. **Row click without button conflict**: Add a row `@click` to open the modal, and add `@click.stop` on the per-row `[Review]` and `[Correct]` buttons so their handlers do not double-fire the row handler (`stopPropagation`).
3. **Region (a) — image**: Render the hi-res front/back scan images (`reviewFrontSrc` / `reviewBackSrc`), zoomable via the existing lightbox (`openLightbox` / `lightboxSrc`). Keep the lightbox Teleport as-is.
4. **Region (b) — un-truncated AI notes**: Render `clean_flag_reason`, `flag_reason`, and `ocr_flag_reason` with no clamp:
   - Ensure `.flag-reason-text` stays un-clamped and uses `white-space: pre-wrap` so multi-line notes wrap fully.
   - Remove the height cap on OCR/notes in the modal: change `.ocr-text` from `max-height: 160px; overflow-y: auto` to no max-height (or a much larger cap) while keeping `white-space: pre-wrap; word-break: break-word`. No `-webkit-line-clamp` or `text-overflow: ellipsis` exists today; ensure none is added.
5. **Region (c) — certifying-body selector + actions**: Fold in the existing halal logo library grid (`halalLogos`, `modalSelectedLogoId`), the admin note (`modalNote`), and the Certify & Resolve (`submitCorrection`) / Dismiss (`submitDismiss`) actions. Reuse `openCorrectionModal`'s state seeding so `modalRow`/detail drive both the read-only sections and the action selector within one container.
6. **Retire the redundant surface**: Remove the standalone Review drawer markup (`drawer-overlay` / `drawer` / `drawer-footer` with "Open Correction Modal") once its sections live in the modal. Keep one container (the modal). Keep all changes contained to `VerificationPanel.vue`.
7. **No backend changes**: Reuse `GET /api/admin/flagged-scans/[id]`, the existing halal logo library fetch, and the existing correction/dismiss endpoints.

### 4. Batch Actions (`AdminManageUserProfile.vue`)

**Specific Changes**:
1. **Remove buttons**: Delete the `<button class="batch-btn archive" ...>Archive</button>` and `<button class="batch-btn delete" ...>Delete</button>` elements from `.batch-buttons`. Keep the notify button (`Send Inactivity Notice`, `runBatch('notify')`).
2. **Simplify `runBatch`**: Either narrow the parameter to `'notify'` only and drop the `archive`/`delete` `window.confirm` branches, OR keep the union type but note that only `'notify'` is reachable from the UI. Recommendation: narrow to `'notify'` to remove dead paths and keep the code honest.
3. **Optional CSS cleanup**: Remove now-unused `.batch-btn.archive` and `.batch-btn.delete` rules (and their `:hover`). Optional, non-behavioral.
4. **Backend unchanged**: `POST /api/admin/users/batch` still accepts `notify`, `archive`, `delete` server-side (preservation 3.9).

## Error Handling

- **Dark Mode load**: `fetchSettings()` keeps its existing `try/catch` that fails silently and retains local defaults when the endpoint is unavailable. With the fix, even on partial/failed responses the applied theme follows localStorage, so no error path can revert the theme. `handleSave` keeps surfacing PUT failures via `errorMessage`.
- **Review modal fetch**: Preserve the existing `try/catch` around `GET /api/admin/flagged-scans/[id]`, setting `errorMessage` on failure and clearing `reviewLoadingId` in `finally`. Certify/dismiss keep their `modalError` handling and `modalActing` guard (no close mid-request).
- **Batch notify**: `runBatch('notify')` keeps its existing error handling and `batchActing` disable-guard.
- **Image rendering**: Keep the existing `@error` fallback on logo images and the "No image" placeholder in the modal.

## Testing Strategy

### Validation Approach

Two phases: first surface the defects on the unfixed code (especially the dark-mode revert), then verify the fixes hold and non-buggy behavior is preserved. Automated type checking uses `vue-tsc --noEmit` (primary gate, given the flaky terminal); the rest is behavioral verification in the browser.

### Exploratory Bug Condition Checking

**Goal**: Confirm the root causes before fixing. Confirm/refute the dark-mode hypothesis and the color/split/batch observations.

**Test Cases**:
1. **Dark Mode revert** (will fail on unfixed code): Enable Dark Mode, navigate Settings → Dashboard → Settings; observe `ion-palette-dark` removed from `<html>` after `fetchSettings()` when the backend value is absent/false.
2. **Backend-absent revert** (will fail on unfixed code): Simulate `/api/admin/settings` returning an object without `darkMode`; confirm `Object.assign` leaves `form.darkMode` false and `applyDarkMode(false)` strips the class.
3. **Color contradiction** (observable): Confirm the "Unverified Halal Logos" card renders with the red token.
4. **Split review + truncation** (observable): Confirm two surfaces are needed, and that `.ocr-text` clamps long OCR content at 160px.
5. **Batch exposure** (observable): Confirm Archive and Delete buttons appear on selection.

**Expected Counterexamples**: Theme reverts to light after settings load; red used for backlog; correction requires a second surface; OCR clamped; destructive buttons present.

### Fix Checking

**Goal**: For all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  applyThemeAndNavigate'(X)
  ASSERT documentElement.hasClass("ion-palette-dark") = true
END FOR
```

**Test Cases**:
1. **Dark-mode persistence**: With Dark Mode on, run `fetchSettings()` with backend `darkMode` absent AND with backend `darkMode:false`; assert `ion-palette-dark` stays on `<html>` and `form.darkMode` reflects localStorage.
2. **Color semantics**: Assert the total card uses the yellow family; assert card/badge/filter share tokens per the semantic table; assert red no longer appears on the backlog card.
3. **Modal open-from-row and un-truncated notes**: Click the row (and separately the [Review] button) → one modal opens with image, selector, and full `flag_reason`/`clean_flag_reason`/`ocr_flag_reason` (no clamp; long OCR fully readable via wrap/scroll, not cut off). Verify button clicks `stopPropagation` (no double open).
4. **Batch toolbar**: Select users → only Send Inactivity Notice is shown; clicking it still POSTs `notify`.

### Preservation Checking

**Goal**: For all inputs where the bug condition does NOT hold, the fixed code equals the original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT original(X) = fixed(X)
END FOR
```

**Testing Approach**: Property-based testing is well-suited to preservation because it exercises many inputs and edge cases automatically. Where PBT is impractical for DOM/theme effects, use targeted behavioral checks capturing pre-fix behavior first.

**Test Cases**:
1. **Light mode preserved**: Dark Mode off → `ion-palette-dark` absent before and after the fix; toggling off from on still applies immediately.
2. **App-boot re-apply preserved**: Reload the app with localStorage `true` → `App.vue` re-applies the class (unchanged).
3. **Green preserved**: "Certified / Resolved" card and `pill-approved`/`conf-green` still green.
4. **Filters/labels preserved**: `verdictClass`/`confidenceClass`/`statusClass`/`statusLabel`/`filteredRows`/`counts` return identical results for all sample rows.
5. **Certify/dismiss preserved**: Certify & Resolve and Dismiss send identical payloads to the same endpoints; `GET /api/admin/flagged-scans/[id]` still supplies images/OCR/attribution.
6. **Batch server-side preserved**: `notify` payload unchanged; backend still supports archive/delete when called directly.

### Unit / Type Tests
- `vue-tsc --noEmit` for all three modified `.vue` files (primary automated gate).
- Helper functions (`verdictClass`, `confidenceClass`, `statusClass`, `statusLabel`, `counts`) sampled across representative statuses/verdicts to confirm unchanged mapping.
- `fetchSettings()` reconciliation logic against backend-absent / backend-false / backend-true inputs.

### Property-Based Tests
- Generate random settings responses (with/without `darkMode`, true/false) with localStorage true → assert applied theme always equals localStorage (dark stays dark).
- Generate random row sets → assert card/badge/filter colors always follow the semantic table (red never on the backlog card).
- Generate random selections → assert the batch toolbar exposes exactly {Send Inactivity Notice}.

### Integration Tests
- Full dark-mode flow: toggle on in Settings → Dashboard → back to Settings → reload → theme persists throughout.
- Full review flow: open modal from row and from [Review] → zoom image via lightbox → read full notes → select certifier → Certify & Resolve; and separately → Dismiss.
- Full batch flow: select users → Send Inactivity Notice → confirm success; verify no Archive/Delete affordance anywhere in the toolbar.
