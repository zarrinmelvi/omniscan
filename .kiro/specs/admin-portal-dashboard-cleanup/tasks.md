# Implementation Plan

## Executor notes (read first)

- **vitest**: run ONLY from an UPPERCASE drive letter. A lowercase `c:\` makes every test file fail to load.
  `cmd /c "cd /d C:\Users\Zarrin\Desktop\Projects\nitro-app && npx.cmd vitest run > out.txt 2>&1"`
  Read `out.txt`, then delete it.
- **Type-check omniscan-ui**:
  `cmd /c "cd /d C:\Users\Zarrin\Desktop\Projects\omniscan-ui && node node_modules/vue-tsc/bin/vue-tsc.js --noEmit > tsc.txt 2>&1"`
  Only the 6 known errors in `src/utils/appBadge.ts` and `src/utils/reminderScheduler.ts` are acceptable. Read `tsc.txt`, then delete it.
- NEVER run vitest and vue-tsc at the same time.
- Baseline: nitro-app vitest = 26 files / 252 tests (before the new test file is added).
- NEVER use `:global(html.ion-palette-dark)` in scoped styles. Use `html.ion-palette-dark .x` selectors. Do NOT edit `dark-mode.css`.
- No renames of existing functions, routes or API fields. New API fields are additive only.
- No schema migration and no Prisma schema change.
- When sub-tasks run in parallel, they MUST touch disjoint files. Parallel-safe groups are marked below; anything not marked runs sequentially.
- Write and run the exploration test BEFORE the fix, on UNFIXED code. Use observation-first for preservation tests.
- Scope: `omniscan-ui/src/views/admin/*`, `nitro-app/server/api/admin/*`, and new files under `nitro-app/server/utils/`.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Admin portal does not match the approved mock
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: The bug is deterministic (stale views, missing fields), so scope each property to the concrete failing case(s)
  - Create `nitro-app/server/tests/admin-portal-dashboard-cleanup.bug.test.ts`. Follow existing patterns: `vi.mock` of `../lib/prisma` and `requireAdminAuth`, call the default handler with a fake h3 event (as in `account-lifecycle.*.test.ts`); read `.vue` files with `fs.readFileSync` for source checks (as in `help-faq.source.test.ts`, `ui-bugcondition.test.ts`)
  - Cases (from isBugCondition in design):
    - Dashboard handler: `stats` includes `unresolved_logos`, `unresolved_logo_scans`, `total_consumers`, `online_consumers`; `halal_logo_scans.logos` contains a zero-count library logo and `pct` is 0 for all when total is 0
    - Queue handler with `status=resolved`: returns `resolved` cards with `outcome` / `decidedAt`, and `metrics.resolved_logos` exists
    - Source `AdminDashboard.vue`: no `Total scans` card label; no `Scan verdicts` panel (no "Scan verdicts" title, no donut); "View all" still links to `/admin/systemlogs?tab=flag-audit`; contains `Unresolved logos`, `Total Consumers`, `Online now`, `Scans by Halal logo`, `/admin/productsdata?tab=halal`
    - Source `VerificationPanel.vue`: no `Auto-resolved by AI` / `Resolved this week` cards; has a `Resolved` tab; references `/approve` and `/dismiss`
    - Source `AdminManageUserProfile.vue`: no SCANS header and no `scan-count-cell`; reads `route.query` for `online`
    - Source `AdminManageProductData.vue`: no Products tab and no `switchTab('products')`
    - Source `AdminSystemLogs.vue`: no `Times scans were flagged`; `topProfileAllergens` has no `.slice(0, 8)` (all allergens listed)
    - Handler `flag-audit-stats.get.ts` (mocked prisma, 12 predefined allergens with ties and 0-count rows): `allergen_profile_counts` has all 12 entries including 0-count ones, sorted by `user_count` desc then `name` asc; response keys unchanged
    - Handler `dashboard.get.ts`: response still contains `scan_verdicts` (must hold before and after)
  - Run on UNFIXED code (vitest command in executor notes)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g. "dashboard stats has no `online_consumers`", "VerificationPanel.vue never calls `/approve`")
  - Mark task complete when the test is written, run, and the failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Everything outside the bug condition is unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Create `nitro-app/server/tests/admin-portal-dashboard-cleanup.preservation.test.ts`
  - Observe on UNFIXED code, record the outputs, then assert them:
    - Dashboard handler with mocked rows: original `stats` keys (`total_scans`, `pending_flags`, `active_consumers`, `resolution_rate`, `api_latency_ms`, `trends`, `sparklines`), `scan_verdicts`, `scans_over_time`, `allergen_distribution`, `attention_certifiers`, `ai_confidence_distribution` keep names and values
    - Queue handler WITHOUT `status`: `unmatched` cards (ids, titles "Unrecognized Halal logo #N", order), `pagination`, original `metrics` keys (`needs_decision`, `needs_decision_scans`, `resolved_this_week`, `auto_resolved_pct`, `awaiting_rescan`), `duplicates`, `training` for generated pending-flag sets (non-halal reasons excluded, `flag-<id>` fallback key, first-seen order)
    - `users.get` online/offline filter `where`, `is_online` per row, `scan_count` still returned (boundary: `last_active` exactly 2 minutes, null `session_token`, null `last_active`)
    - `/api/admin/flag-audit-stats` output shape unchanged
    - Source preservation: Allergen Dictionary / Halal Logo Library / Ingredient Mappings tab markup and the `?tab=halal` branch remain; Dashboard still contains "Scans over time", "Halal certifiers needing attention", "Allergens listed by Consumers" (its data stays `slice(0, 8)` in `dashboard.get.ts`); System Logs still contains "Consumers who listed each allergen"; `flag-audit-stats` keys and item shapes unchanged; Unresolved tab still has "Exceptions queue", "Needs decision", `?card=` and `?tab=needs-decision` handling
  - Use fast-check if already a nitro-app dev dependency; otherwise table-driven loops over generated inputs
  - Run on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms the baseline behavior to preserve)
  - Mark task complete when the tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.12, 3.13_

- [x] 3. Fix for admin portal dashboard cleanup

  - [x] 3.1 A. Shared server helpers (sequential; must finish before 3.2 and 3.3)
    - Create `nitro-app/server/utils/onlineStatus.ts`: `ONLINE_WINDOW_MS = 2 * 60 * 1000`, `onlineSince(now)`, `onlineWhere(now)` returning `{ session_token: { not: null }, last_active: { gte: onlineSince(now) } }`, `isOnline(user, now)`
    - Edit `nitro-app/server/api/admin/users.get.ts` to import these instead of its local constant and inline objects. Behavior MUST stay identical (offline filter, `is_online` row field, `scan_count`)
    - Create `nitro-app/server/utils/flagGroups.ts`: move `HALAL_KEYWORDS`, `isHalalReason`, and the group key rule (`scan.product.product_name || 'flag-' + id`); add `groupFlagsByLogo(rows)` returning `Map<string, Row[]>` in first-seen order; add `getUnresolvedLogoSummary(db = prisma)` returning `{ logoCount, scanCount }` using a light select (no base64) and the halal filter
    - Edit `nitro-app/server/api/admin/verification-queue.get.ts` to use `isHalalReason` and `groupFlagsByLogo` from the helper. Cards must be built exactly as now, so "#N" numbering is unchanged
    - Files touched: `server/utils/onlineStatus.ts`, `server/utils/flagGroups.ts`, `server/api/admin/users.get.ts`, `server/api/admin/verification-queue.get.ts`
    - _Bug_Condition: isBugCondition(input) where online definition and unresolved grouping are trapped inside single handlers (design root causes 2, 3)_
    - _Expected_Behavior: Dashboard and queue share one grouping and one online definition_
    - _Preservation: users.get and queue default output unchanged; account-lifecycle.preservation.test.ts keeps passing_
    - _Requirements: 2.8, 2.9, 2.10, 3.5, 3.6, 3.8_

  - [x] 3.2 B. Dashboard API fields (after 3.1; may run in parallel with 3.3 only if 3.3 does not touch `dashboard.get.ts`, which it does not)
    - Edit `nitro-app/server/api/admin/dashboard.get.ts` ONLY
    - Add to `stats`: `unresolved_logos`, `unresolved_logo_scans` (from `getUnresolvedLogoSummary()`), `total_consumers` (`prisma.user.count({ where: { deleted_at: null } })`, reuse the `active_consumers` value), `online_consumers` (`prisma.user.count({ where: { deleted_at: null, ...onlineWhere(now) } })`)
    - Add top-level `halal_logo_scans: { total, logos: [{ id, certifier, full_name, count, pct }] }`
      - Logos: `prisma.halalLogo.findMany({ select: { id, certifier, full_name } })`, no filter, so every library logo is included (zero-scan too)
      - Counts: `productHalalLogo.findMany({ where: { deleted_at: null } })` joined in memory with `scan.groupBy({ by: ['product_id'] })`; a scan of a product with two logos counts once per logo; `total` = sum of per-logo counts
      - `pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0` (no division by zero)
      - Sort by count desc, then certifier asc
    - Keep ALL existing fields (`total_scans`, `pending_flags`, `active_consumers`, `resolution_rate`, `api_latency_ms`, `trends`, `sparklines`, `ai_confidence_distribution`, `scan_verdicts`, `scans_over_time`, `allergen_distribution`, `attention_certifiers`)
    - _Bug_Condition: isBugCondition(input) where input.route = '/admin/dashboard' and the unresolved, consumer, online or halal chart data is missing_
    - _Expected_Behavior: stats and halal_logo_scans match design section B; dashboard.unresolved_logos = queue.metrics.needs_decision_
    - _Preservation: existing dashboard fields keep names and values_
    - _Requirements: 2.7, 2.8, 2.10, 3.3, 3.8_

  - [x] 3.3 C. Verification-queue resolved mode (after 3.1; parallel-safe with 3.2, touches only `verification-queue.get.ts`)
    - Edit `nitro-app/server/api/admin/verification-queue.get.ts` ONLY
    - Add optional query `status=unresolved|resolved` (default `unresolved`)
    - `metrics` gains `resolved_logos` and `resolved_logo_scans` (always present). Existing metric keys unchanged
    - Default mode: response identical to today plus the two new metrics and `resolved: []`
    - `status=resolved`: `unmatched` is `[]`, `resolved` holds the page of resolved cards, `pagination` describes the resolved list (same page clamp logic)
    - Resolved grouping: flags with `status in (approved, dismissed)` and `isHalalReason`; light select first (`id`, `status`, `updated_at`, `scan.user_id`, `scan.product.id/product_name`); same group key; newest decision first; fetch thumbnails (`logo_crop_base64`, product image) ONLY for groups on the requested page
    - Resolved card = existing Card fields plus `outcome: 'approved' | 'dismissed'`, `outcomeLabel: 'Added to certifier registry' | 'Not a Halal certifier'`, `decidedAt` (ISO string). Outcome and date come from the row with the latest `updated_at` in the group. Title `Unrecognized Halal logo #N`, numbered within the resolved list
    - A product name with both pending and resolved rows appears in both lists (intended)
    - Do NOT edit the approve or dismiss endpoint files
    - _Bug_Condition: isBugCondition(input) where input.route = '/admin/verification' and the server cannot return resolved cards_
    - _Expected_Behavior: resolved cards with outcome and decidedAt, resolved counts in metrics_
    - _Preservation: default mode output unchanged; `?card=` and `?tab=needs-decision` data unchanged_
    - _Requirements: 2.4, 3.4, 3.5_

  - [x] 3.4 D. `VerificationPanel.vue` (after 3.3; parallel-safe with 3.5 to 3.8 because it touches only this file)
    - Edit `omniscan-ui/src/views/admin/VerificationPanel.vue` ONLY
    - Remove the `queue-metrics` block, its `.qm-*` CSS and the `queueMetrics` computed. Keep the `metrics` ref
    - Tabs: pill buttons "Unresolved {{ metrics.needs_decision }}" and "Resolved {{ metrics.resolved_logos }}" with `role="tablist"` / `role="tab"` / `aria-selected`. `TabType = 'unmatched' | 'resolved'`; default `unmatched`
    - `fetchQueue()` sends `status=resolved` on the Resolved tab. Switching tabs resets `page` to 1, collapses any expanded card and refetches
    - Resolved card: same collapsed layout (thumb, title, meta), no Review button, no decision buttons, no impact banner. Shows an outcome badge and "Decided {{ date }}". Empty state "Nothing resolved yet." Same pagination bar. Resolved cards never use `expandedId`, `openAddDialog` or `openNotHalalDialog`
    - Query handling on mount and in the `route.query` watcher: `tab=resolved` selects Resolved, `tab=needs-decision` selects Unresolved; `?card=` only applies on Unresolved
    - Wire approve/dismiss persistence (design finding 6), using existing endpoints, unchanged:
      - FIRST read the `POST /api/halal_logo` handler (`nitro-app/server/api/halal_logo*`) and check whether its response contains an id for the created logo
      - `confirmAddCertifier`: after `POST /api/halal_logo` succeeds, call `POST /api/admin/flagged-scans/:id/approve` for every id in `card.rawIds`. Send `halal_logo_id` only if the create response provides an id; otherwise approve without it (still records approval and audit event). Then refetch
      - `confirmNotHalal`: call `POST /api/admin/flagged-scans/:id/dismiss` for every id in `card.rawIds` with `admin_correction` = the entered reason, then refetch. Keep the optimistic `resolvedIds` removal and the same toasts
      - On partial failure, show the existing dialog error pattern and refetch so the list reflects the truth
    - New styles scoped; dark mode via `html.ion-palette-dark .x`; never `:global(html.ion-palette-dark)`
    - _Bug_Condition: isBugCondition(input) where input.route = '/admin/verification' and (metricCardsShown OR NOT resolvedTabShown)_
    - _Expected_Behavior: two pill tabs, read-only Resolved list with outcome and date, decisions persisted (confirmed decision, bugfix A11)_
    - _Preservation: Unresolved tab title, subtitle, card layout, dialogs, toasts, pagination, deep links unchanged_
    - _Requirements: 2.3, 2.4, 2.13, 3.4, 3.5, 3.10_

  - [x] 3.5 E. `AdminDashboard.vue` with the vertical bar chart (after 3.2; parallel-safe with 3.4, 3.6, 3.7, 3.8)
    - Edit `omniscan-ui/src/views/admin/AdminDashboard.vue` ONLY
    - Types: extend `DashboardStats` with `unresolved_logos`, `unresolved_logo_scans`, `total_consumers`, `online_consumers`; add `HalalLogoScans`. Read with `?? 0` / `?? []` so an old server response never breaks the page
    - Header subtitle "N unresolved logos need your review." (skeleton while loading), click goes to `/admin/verification?tab=needs-decision`; greeting "Welcome back, {name}." unchanged
    - Metric grid of 3 cards in order (keep `.metric-grid` / `.metric-card`): "Unresolved logos" (sub "distinct logos, covering N scans", to `/admin/verification?tab=needs-decision`), "Total Consumers" (sub "registered accounts", to `/admin/usersprofile`), "Online now" (sub "of N Consumers", to `/admin/usersprofile?status=online`). Remove Total scans, Pending flags and Active Consumers cards. Cards are keyboard reachable (`role="link"`, `tabindex="0"`, Enter/Space)
    - Layout: row with "Allergens listed by Consumers" and "Scans by Halal logo", then "Scans over time" (7/30/90 pills), then "Halal certifiers needing attention". REMOVE the "Scan verdicts" panel (donut and its center total-scans number). Do NOT remove `scan_verdicts` from the API or from the response type; remove now-dead Scan-verdicts-only refs/handlers/CSS only if grep shows no other use
    - "Allergens listed by Consumers" card: keep its current top N data unchanged. Keep the "View all" `router-link` target exactly `/admin/systemlogs?tab=flag-audit` (already correct in the code; the fix is the list on the Flag Audit tab, see 3.8 and 3.8.1)
    - Vertical bar chart, plain HTML/CSS, no new dependency:
      - `.halal-chart` card with `role="group"` and `aria-labelledby` the title; visible "Manage" `router-link` to `/admin/productsdata?tab=halal`
      - Bars area is a flex row with `overflow-x: auto`; each column `min-width: 56px`
      - Each bar is `<button type="button" class="hb-bar">` with `aria-label="{{ certifier }}: {{ count }} scans, {{ pct }} percent. Open Halal Logo Library"`; height = `count / max(maxCount, 1)` of the track; 0-count bars get `min-height: 4px`
      - Label above each bar: `count (pct.toFixed(1)%)`, e.g. `0 (0.0%)`; certifier code below; `title` holds `full_name`
      - Clicking a bar, the card background or Manage calls `router.push('/admin/productsdata?tab=halal')`. Card background click is mouse-only convenience (no nested focusables)
      - States: skeleton while loading; empty note "No Halal logos in the library yet."
      - Dark mode: `html.ion-palette-dark .halal-chart ...` selectors in scoped CSS (card bg, border, text, track, bar color, `:focus-visible` ring with 2px outline). No `:global()`. No `dark-mode.css` edit
    - Leave already-unused code alone to keep the diff small
    - _Bug_Condition: isBugCondition(input) where input.route = '/admin/dashboard' and (totalScansCardShown OR missing new cards OR NOT scansByHalalLogoChartShown OR subtitleIsFlagCount)_
    - _Expected_Behavior: requirements 2.5, 2.7, 2.8, 2.9, 2.10, 2.12_
    - _Preservation: Scans over time, certifier list and the Allergens card render the same data and destinations; `scan_verdicts` stays in the API_
    - _Requirements: 2.5, 2.7, 2.8, 2.9, 2.10, 2.12, 3.7, 3.10, 3.12, 3.13_

  - [x] 3.6 F. `AdminManageUserProfile.vue` query handling and SCANS column removal (parallel-safe)
    - Edit `omniscan-ui/src/views/admin/AdminManageUserProfile.vue` ONLY
    - Import `useRoute`. Add `applyQueryFilters()`: read `route.query.status`, fall back to `route.query.sort`; lowercased `online` sets `filterStatus = 'Online'` (status wins when both are present, so `sort=online&status=offline` gives Offline); `status=offline` sets `'Offline'`; unknown values leave the filter unchanged
    - Call it in setup BEFORE `onMounted(fetchUsers)` and before the `watch([filterStatus, sortOrder])` is registered, so the first request already carries `status=Online` with no double fetch; page starts at 1
    - Add `watch(() => route.query, ...)`: re-apply; if `filterStatus` changed, the existing watcher resets to page 1 and fetches; otherwise call `resetAndFetch()`
    - Remove the SCANS `<th>` and `<td class="scan-count-cell">` from the main table, the SCANS `<th>` and its skeleton `<td>` from the skeleton table, and the unused `.scan-count-cell` CSS. Resulting columns: CONSUMER, EMAIL, PANTRY ITEMS, CREATED, STATUS
    - Keep `scan_count` in the `UserRow` type. Lifecycle tables are untouched. No server change
    - _Bug_Condition: isBugCondition(input) where input.route = '/admin/usersprofile' and (scansColumnShown OR online query ignored)_
    - _Expected_Behavior: requirements 2.6, 2.9_
    - _Preservation: search, sort, status filter, pagination, lifecycle cards, row actions unchanged_
    - _Requirements: 2.6, 2.9, 3.6, 3.8_

  - [x] 3.7 G. `AdminManageProductData.vue` Products tab removal (parallel-safe)
    - Edit `omniscan-ui/src/views/admin/AdminManageProductData.vue` ONLY
    - Remove the Products tab button (with its count badge), the `activeTab === 'products'` panel, and `'products'` from `TabType`
    - Remove Products-only state and functions (`fetchProducts`, `productList`, `productTotal*`, `productTabBadge`, `productSearch`, `productSort`, `productLoading`, `productError`, `productAllergenFilter`, `productPage`, `filteredProductList`, `productRangeLabel`, merge helpers, and the Products branches of `fetchTabCounts`, `fetchTabContent`, `getTabTitle`). Rule: delete a symbol only after grep shows no remaining reference outside the removed panel; shared symbols stay
    - `onMounted`: drop the `tabParam === 'products'` branch so `?tab=products` loads `allergen`; `?tab=halal` and `?tab=allergen` unchanged
    - Remove Products-only CSS only if exclusively used by the Products panel
    - Do NOT touch `/api/admin/products*` endpoints
    - Verify with grep for `product[A-Z]` that nothing dangles
    - _Bug_Condition: isBugCondition(input) where input.route = '/admin/productsdata' and (productsTabShown OR tab=products opens Products)_
    - _Expected_Behavior: requirement 2.1_
    - _Preservation: Allergen, Halal, Ingredient tabs and badges unchanged; product endpoints and data untouched_
    - _Requirements: 2.1, 3.1, 3.2_

  - [x] 3.8 H. `AdminSystemLogs.vue` flag section removal and full allergen list (parallel-safe; also edits the Flag Audit list for design section I)
    - Edit `omniscan-ui/src/views/admin/AdminSystemLogs.vue` ONLY
    - Flag Audit list (design section I): make `topProfileAllergens` return ALL allergens, sorted by `user_count` desc then `name` asc (copy before sorting; keep the name `topProfileAllergens`); remove `.slice(0, 8)`. Allergens with 0 Consumers render `0 (0.0%)`. After this, "Consumers who listed each allergen" is the only chart on the tab. `?tab=flag-audit` handling on mount stays unchanged
    - Delete the `fa-flag-section` block ("Times scans were flagged", its rows, the "MOST FLAGGED PRODUCTS" expander and the `?tab=products` link)
    - Remove now-unused `expandedAllergen`, `toggleAllergen`, `maxFlagCount`, `formatFlagDate` (only if used exclusively there) and `.fa-flag-*`, `.fa-expand*`, `.fa-product-*` CSS
    - Keep `AllergenFlagCount` typing and `allergen_flag_counts` in the response interface (response shape unchanged)
    - "Consumers who listed each allergen" and `flagStats` loading stay as is
    - _Bug_Condition: isBugCondition(input) where input.route = '/admin/systemlogs' and timesScansFlaggedSectionShown_
    - _Expected_Behavior: requirements 2.2, 2.11, 2.12_
    - _Preservation: Overview, API Latency, audit log, allergen consumers section styling and title, flag-audit-stats response shape_
    - _Requirements: 2.2, 2.11, 2.12, 3.3, 3.13_

  - [x] 3.8.1 I. `flag-audit-stats.get.ts` deterministic full list (parallel-safe; touches only `nitro-app/server/api/admin/flag-audit-stats.get.ts`, disjoint from 3.5 and 3.8)
    - Code reading result: the endpoint does NOT truncate (no `take`, no `slice` on `allergen_profile_counts`; it returns every `is_predefined` allergen including 0-count ones). Nothing to remove. The top-8 limit lives only in `AdminSystemLogs.vue` (3.8)
    - Change the sort of `allergen_profile_counts` to `user_count` desc, then `name.localeCompare` asc. Keep `allergen_flag_counts`, `total_active_consumers`, field names and item shapes exactly as they are (additive/compatible; only tie order changes)
    - Confirm "allergen dictionary" = `is_predefined: true` by checking how the Allergen Dictionary tab lists rows; if it also includes non-predefined rows, include them in the same list without renaming fields
    - Do not edit `dashboard.get.ts`'s `allergen_distribution` (Dashboard card keeps top N)
    - _Bug_Condition: isBugCondition(input) where input.route = '/admin/systemlogs' and input.query.tab = 'flag-audit' and NOT allAllergensListed(input)_
    - _Expected_Behavior: every allergen listed, count desc then name asc (design section I)_
    - _Preservation: `/api/admin/flag-audit-stats` field names and item shape unchanged_
    - _Requirements: 2.11, 3.3, 3.13_

  - [x] 3.9 Write unit tests for the new helpers and handlers (after 3.1 to 3.3)
    - Create `nitro-app/server/tests/admin-portal-dashboard-cleanup.unit.test.ts`
    - `groupFlagsByLogo` / `getUnresolvedLogoSummary`: grouping by product name, `flag-<id>` fallback, non-halal reasons excluded
    - `onlineWhere` / `isOnline`: boundary at exactly 2 minutes, null `session_token`, null `last_active`
    - Halal chart math in dashboard handler: zero total gives `pct = 0` everywhere; counts sum to total; product with two logos counts for each; zero-scan logos present; sort by count desc then certifier asc
    - Queue resolved mode: outcome from latest `updated_at` in a group, pagination clamp, thumbnails fetched only for the requested page, default mode returns `resolved: []`
    - Query-parsing logic for the user list: `status=online`, `sort=online`, both present, unknown values
    - `flag-audit-stats` handler: all predefined allergens returned including 0-count ones, sort count desc then name asc, response keys unchanged
    - _Requirements: 2.4, 2.7, 2.9, 2.10, 2.11, 3.8, 3.13_

  - [x] 3.10 Write property-based tests for fix checking (after 3.1 to 3.3)
    - Add to `nitro-app/server/tests/admin-portal-dashboard-cleanup.unit.test.ts` (or a sibling `.property.test.ts`)
    - Random pending-flag sets: `getUnresolvedLogoSummary` equals queue `needs_decision` / `needs_decision_scans`
    - Random scans, links and logos: `sum(pct)` is 100 (within 0.1) when total > 0; every `pct` is 0 when total is 0; `logos.length` equals library size
    - Random user sets: dashboard `online_consumers` equals the number of rows `users.get` marks `is_online`
    - Random queue inputs without `status`: old grouping and new handler return equal `unmatched` cards
    - Random allergen sets with random user counts: `flag-audit-stats` `allergen_profile_counts` has the same length as the predefined set, is sorted by count desc then name asc, and contains every 0-count allergen
    - _Requirements: 2.7, 2.10, 2.11, 3.5, 3.8_

  - [x] 3.11 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Admin portal matches the approved mock
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - Run `admin-portal-dashboard-cleanup.bug.test.ts` via the vitest command in the executor notes (uppercase drive letter, read then delete `out.txt`)
    - **EXPECTED OUTCOME**: Test PASSES (confirms the bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13_

  - [x] 3.12 Verify preservation tests still pass
    - **Property 2: Preservation** - Everything outside the bug condition is unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run the full nitro-app vitest suite (uppercase drive letter); confirm `account-lifecycle.preservation.test.ts` and all 26 baseline files / 252 baseline tests still pass, plus the new test files
    - Then (never at the same time as vitest) run `vue-tsc` for omniscan-ui; only the 6 known errors in `src/utils/appBadge.ts` and `src/utils/reminderScheduler.ts` are acceptable
    - Confirm no `:global(html.ion-palette-dark)` in changed files and `dark-mode.css` has no diff (`git diff --stat`)
    - Confirm no Prisma schema or migration changes and that the approve/dismiss endpoint files are unmodified
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure vitest and vue-tsc are green per the executor notes (run them one after the other, never together), delete `out.txt` / `tsc.txt`
  - Manual check in dark mode for the cards, the vertical chart (including focus ring) and the tabs; keyboard-only operation of the chart bars and the Dashboard cards
  - Manual flow check: Dashboard "Allergens listed by Consumers" > "View all" opens System Logs > Flag Audit with every allergen listed (0 Consumers as `0 (0.0%)`) and no Scan verdicts panel on the Dashboard
  - Manual flow check: Dashboard "Online now" lands on `/admin/usersprofile?status=online` with "Online" selected; Not a Halal certifier decision moves a card from Unresolved to Resolved; `?tab=products` opens Allergen Dictionary
  - Ask the user if questions arise.
