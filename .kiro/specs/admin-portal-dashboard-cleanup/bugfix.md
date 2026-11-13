# Bugfix Requirements Document

## Introduction

The admin portal does not match the approved mock UI. Several panels the admin no longer wants are still shown (Products tab, "Times scans were flagged" chart, Verification Panel metric cards, Total scans card, per-user scan counts). Pieces the admin does want are missing or in the wrong place: the "unresolved logos" card lives in the Verification Panel instead of the Dashboard, the Dashboard has no "Total Consumers" / "Online now" cards or "Scans by Halal logo" chart, "Online now" cannot deep-link into a filtered Manage User Profiles list, and the Verification Panel has no "Resolved" tab.

The target is the two mock screens (Dashboard and Verification Panel). Scope is the admin portal only: `omniscan-ui/src/views/admin/*` and the admin endpoints in `nitro-app/server/api/admin/*`.

**Assumptions (approved by the user, with the changes recorded in A2, A10 and A11):**

- A1. "total scans dashboard" means removing the "Total scans" stat card from the Admin Dashboard.
- A2. (Confirmed decision, updated) The Dashboard also has "Scan verdicts" (donut, whose center shows total scans), "Scans over time" (area chart with 7/30/90 day pills) and "Halal certifiers needing attention". The mock shows none of these. "Scans over time" and "Halal certifiers needing attention" are KEPT on the Dashboard, below the mock cards. The "Total scans" stat card AND the whole "Scan verdicts" panel (donut and its center total-scans number) are REMOVED from the Dashboard UI. The dashboard API field `scan_verdicts` stays in the response (no field removal); the UI simply no longer uses it.
- A3. The "22 unresolved" card moves to the Dashboard as "Unresolved logos" (value = distinct unresolved logos, sub-text "distinct logos, covering N scans"). Clicking it opens the Verification Panel on the Unresolved tab. The Dashboard header subtitle becomes "N unresolved logos need your review." using the same number.
- A4. "Total Consumers" replaces the current "Active Consumers" card and counts non-deleted consumers (sub-text "registered accounts"). "Online now" uses the existing definition: `session_token` is set AND `last_active` is within the last 2 minutes (sub-text "of N Consumers").
- A5. "sort online" is implemented as the existing Online option of the status dropdown in Manage User Profiles, driven by a URL query (`?status=online`). The dropdown must show "Online" when it is applied. The page also accepts `?sort=online` as an alias.
- A6. "Resolved" means a flagged halal-logo scan that an admin already decided: status `approved` (Add to certifier registry) or `dismissed` (Not a Halal certifier). The server today returns only pending items plus a resolved count, so the queue endpoint must also return resolved cards, grouped the same way as unresolved ones.
- A7. "Scans by Halal logo" counts scans whose product is linked to a Halal logo (scan, product, product-halal-logo link, halal logo), grouped by certifier. (Confirmed decision) The chart shows EVERY Halal logo in the library, including logos with 0 scans; a 0-scan bar renders as an empty/minimal bar labeled "0 (0.0%)". Percent is the share of total scans across all library logos (0 when the total is 0, with no division by zero). Bars are sorted by count, highest first.
- A8. Removing the Products tab removes only the admin UI tab. Product rows, the products admin endpoints, scan dedup and the alternatives feature are untouched. A stale `?tab=products` link falls back to the default tab.
- A9. The "Times scans were flagged" chart removal also removes its "most flagged products" expanders and the link to `?tab=products` that lives inside them. The `/api/admin/flag-audit-stats` response shape stays as is.
- A10. (Confirmed decision) Dashboard "Allergens listed by Consumers" > "View all" goes to System Logs > Flag Audit, whose "Consumers who listed each allergen" chart is the only chart there and lists ALL allergens of the allergen dictionary. Code reading found that "View all" already links to `/admin/systemlogs?tab=flag-audit` and that `AdminSystemLogs.vue` already honors `?tab=flag-audit` on mount; the real gaps are the UI `slice(0, 8)` and the server sort having no name tiebreak. `flag-audit-stats.get.ts` does not truncate (it returns every `is_predefined` allergen), so the only server change is a deterministic sort (count desc, then name asc); response field names stay the same.
- A11. (Confirmed decision) The Verification Panel saves the admin's decisions: "Add to certifier registry" calls the existing approve endpoint and "Not a Halal certifier" calls the existing dismiss endpoint for every flagged scan in the card (design section D). The endpoints themselves are not changed.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an admin opens Manage Product Data THEN the system shows a "Products" tab (with a count badge) next to Allergen Dictionary, Halal Logo Library and Ingredient Mappings, and opens that tab for `?tab=products`.

1.2 WHEN an admin opens System Logs > Flag Audit THEN the system shows a second section "Times scans were flagged" (bars per allergen with dates and expanders) below "Consumers who listed each allergen".

1.3 WHEN an admin opens the Verification Panel THEN the system shows three metric cards above the tabs (Auto-resolved by AI, Needs your decision, Resolved this week).

1.4 WHEN an admin opens the Verification Panel THEN the system shows a single tab labeled "Unmatched logos · N" and no way to see logos that were already decided.

1.5 WHEN an admin opens the Dashboard THEN the system shows a "Total scans" card as the first of three metric cards.

1.6 WHEN an admin opens Manage User Profiles THEN the system shows a SCANS column with each consumer's scan count.

1.7 WHEN an admin opens the Dashboard THEN the system shows no chart of scans per Halal logo, so the admin cannot see which certifiers are most scanned or jump to the Halal Logo Library from it.

1.8 WHEN an admin opens the Dashboard THEN the system shows "Pending flags" and "Active Consumers" cards, with no "Online now" card, and the header subtitle shows a flag count ("N items need your review") instead of the unresolved logo count.

1.9 WHEN an admin navigates to Manage User Profiles with a query such as `?status=online` or `?sort=online` THEN the system ignores the query and shows the unfiltered list with "All statuses" selected.

1.10 WHEN an admin wants the unresolved logo count THEN the system exposes it only on the Verification Panel ("Needs your decision" card), and the Dashboard's "Pending flags" card counts flagged scans rather than distinct unresolved logos.

1.11 WHEN an admin opens the Dashboard THEN the system shows a "Scan verdicts" panel (donut with the total-scans number in its center) that the admin no longer wants.

1.12 WHEN an admin opens System Logs > Flag Audit THEN the system lists only the top 8 allergens in "Consumers who listed each allergen" (the limit is applied in `AdminSystemLogs.vue`; `/api/admin/flag-audit-stats` already returns every predefined allergen), so allergens beyond the 8th, including allergens with 0 Consumers, are not visible.

1.13 WHEN an admin clicks "View all" on the Dashboard "Allergens listed by Consumers" card THEN the system already navigates to `/admin/systemlogs?tab=flag-audit`, but that tab shows only the top 8 allergens, so "View all" does not actually show all of them.

1.14 WHEN an admin confirms "Add to certifier registry" or "Not a Halal certifier" on the Verification Panel THEN the system does not call the approve/dismiss endpoints, so the flag status never becomes `approved`/`dismissed` and the card returns after a reload.

### Expected Behavior (Correct)

2.1 WHEN an admin opens Manage Product Data THEN the system SHALL show only the Allergen Dictionary, Halal Logo Library and Ingredient Mappings tabs, and SHALL fall back to the default tab for `?tab=products`.

2.2 WHEN an admin opens System Logs > Flag Audit THEN the system SHALL show only the "Consumers who listed each allergen" section and SHALL NOT show "Times scans were flagged".

2.3 WHEN an admin opens the Verification Panel THEN the system SHALL NOT show the Auto-resolved, Needs your decision or Resolved this week metric cards.

2.4 WHEN an admin opens the Verification Panel THEN the system SHALL show two pill tabs, "Unresolved N" (active by default) and "Resolved M", where N is the count of distinct unresolved logos and M is the count of distinct resolved logos, and the Resolved tab SHALL list logos already decided (added to the certifier registry or marked not a Halal certifier) with their outcome, using the same card layout and pagination as the Unresolved tab.

2.5 WHEN an admin opens the Dashboard THEN the system SHALL NOT show a "Total scans" card and SHALL NOT show the "Scan verdicts" panel (donut, including its center total-scans number), and SHALL CONTINUE TO show "Scans over time" and "Halal certifiers needing attention" below the mock cards. The `scan_verdicts` field SHALL remain in the dashboard API response.

2.6 WHEN an admin opens Manage User Profiles THEN the system SHALL NOT show the SCANS column (header, cells and skeleton cells), and the table SHALL show CONSUMER, EMAIL, PANTRY ITEMS, CREATED and STATUS.

2.7 WHEN an admin opens the Dashboard THEN the system SHALL show a "Scans by Halal logo" card with a vertical bar chart (one bar per Halal logo in the library, including logos with 0 scans, with count and percent labels such as "0 (0.0%)"; percent is the share of total scans across all library logos and is 0 when the total is 0), and WHEN the admin clicks the card or a bar THEN the system SHALL navigate to `/admin/productsdata?tab=halal` (Halal Logo Library).

2.8 WHEN an admin opens the Dashboard THEN the system SHALL show the greeting "Welcome back, {name}." with the subtitle "N unresolved logos need your review." and three cards in this order: "Unresolved logos", "Total Consumers" ("registered accounts") and "Online now" ("of N Consumers"), above the "Allergens listed by Consumers" and "Scans by Halal logo" cards, followed by the kept "Scans over time" and "Halal certifiers needing attention" panels (no "Scan verdicts" panel).

2.9 WHEN an admin clicks "Online now" on the Dashboard, or opens Manage User Profiles with `?status=online` (or `?sort=online`), THEN the system SHALL load the list filtered to online consumers on first load, SHALL show "Online" selected in the status dropdown, and SHALL reset to page 1.

2.10 WHEN an admin opens the Dashboard THEN the system SHALL show the "Unresolved logos" card with the distinct unresolved logo count and "distinct logos, covering N scans" (the same numbers the Verification Panel's Unresolved tab uses), and WHEN the admin clicks it THEN the system SHALL navigate to `/admin/verification` with the Unresolved tab active.

2.11 WHEN an admin opens System Logs > Flag Audit THEN the system SHALL list EVERY allergen of the allergen dictionary in "Consumers who listed each allergen" (no top-8 limit), including allergens with 0 Consumers shown as `0 (0.0%)`, sorted by Consumer count descending and then by name ascending. This chart SHALL be the only chart on the Flag Audit tab.

2.12 WHEN an admin clicks "View all" on the Dashboard "Allergens listed by Consumers" card THEN the system SHALL navigate to System Logs > Flag Audit (`/admin/systemlogs?tab=flag-audit`) and show the "Consumers who listed each allergen" chart with all allergens (2.11). The Dashboard card itself SHALL keep showing its current top N.

2.13 WHEN an admin confirms "Add to certifier registry" or "Not a Halal certifier" on the Verification Panel THEN the system SHALL persist the decision through the existing approve/dismiss endpoints for every flagged scan in the card, so the card leaves the Unresolved tab, stays gone after a reload, and appears on the Resolved tab.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an admin uses the Allergen Dictionary, Halal Logo Library or Ingredient Mappings tabs (search, add, edit, delete, pagination, tab badges, unsaved-changes prompts) THEN the system SHALL CONTINUE TO behave as before, and `?tab=halal` and `?tab=allergen` SHALL CONTINUE TO open the matching tab.

3.2 WHEN scans are processed or consumers use scan dedup, product matching and alternatives THEN the system SHALL CONTINUE TO read and write Product data exactly as before, and the admin products API endpoints SHALL CONTINUE TO exist.

3.3 WHEN an admin opens System Logs > Overview, API Latency or the audit log, or opens Flag Audit "Consumers who listed each allergen" THEN the system SHALL CONTINUE TO show them as before, and the `/api/admin/flag-audit-stats` response shape (field names and types) SHALL remain unchanged; only the consumers-per-allergen list is no longer truncated (see 2.11).

3.4 WHEN an admin expands an unresolved logo card and chooses "Add to certifier registry" or "Not a Halal certifier" THEN the system SHALL CONTINUE TO apply the same effects (flag status becomes approved or dismissed, product halal links updated, audit event logged, toast shown, card leaves the Unresolved tab). The approve/dismiss endpoints are unchanged; the panel now calls them (2.13).

3.5 WHEN an admin opens the Verification Panel Unresolved tab THEN the system SHALL CONTINUE TO show the title "Exceptions queue", the subtitle, logo cards ("Unrecognized Halal logo #N", "Needs decision", scan/product/Consumer counts), pagination, and `?card=` / `?tab=needs-decision` deep links.

3.6 WHEN an admin uses Manage User Profiles search, sort ("Newest first"/"Oldest first"), status filter (All, Online, Offline, plus lifecycle), pagination, lifecycle cards and row actions THEN the system SHALL CONTINUE TO behave as before, and the `/api/admin/users` response fields (including `scan_count`) SHALL remain unchanged.

3.7 WHEN an admin clicks an allergen bar in "Allergens listed by Consumers" THEN the system SHALL CONTINUE TO show the same data and navigate to the same destination. The Dashboard card itself SHALL CONTINUE TO show its current top N allergens (unchanged); its "View all" link is covered by 2.12.

3.8 WHEN a consumer is online (session token set and last active within 2 minutes) THEN the system SHALL CONTINUE TO mark them online in Manage User Profiles using the same definition, and the Dashboard "Online now" count SHALL use that same definition.

3.9 WHEN an admin signs in, stays signed in, or signs in from another device THEN the system SHALL CONTINUE TO enforce admin auth and single-session SSE as before.

3.10 WHEN the admin portal is in dark mode THEN every new or changed element (cards, vertical chart, tabs) SHALL CONTINUE TO render legibly using `html.ion-palette-dark .x` selectors in scoped styles, without editing `dark-mode.css`.

3.11 WHEN the existing test suites run THEN nitro-app vitest SHALL CONTINUE TO pass (26 files / 252 tests) and omniscan-ui `vue-tsc` SHALL CONTINUE TO report only the 6 known errors in `src/utils/appBadge.ts` and `src/utils/reminderScheduler.ts`.

3.12 WHEN the dashboard API (`/api/admin/dashboard`) is called THEN the system SHALL CONTINUE TO return `scan_verdicts` (and every other existing field) with the same name and values, even though the Dashboard UI no longer renders the Scan verdicts panel.

3.13 WHEN an admin opens the Dashboard THEN the "Allergens listed by Consumers" card SHALL CONTINUE TO show its current top N allergens with the same data, and `/api/admin/flag-audit-stats` SHALL CONTINUE TO return the same field names (`allergen_profile_counts`, `allergen_flag_counts`, `total_active_consumers`) with the same per-item shape.
