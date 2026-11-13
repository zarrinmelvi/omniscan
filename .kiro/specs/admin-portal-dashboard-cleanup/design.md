# Admin Portal Dashboard Cleanup Bugfix Design

## Overview

The admin portal drifts from the approved mock: unwanted panels remain (Products tab, "Times scans were flagged", Verification metric cards, Total scans card, SCANS column), wanted pieces are missing (Dashboard "Unresolved logos", "Total Consumers", "Online now", "Scans by Halal logo"; Verification "Resolved" tab), and `?status=online` is ignored by Manage User Profiles.

The fix is additive on the server and subtractive/rewiring in the UI:

- Server: add new fields to `GET /api/admin/dashboard`, add a `status=resolved` mode and resolved counts to `GET /api/admin/verification-queue`, and extract two small shared helpers so the Dashboard and the queue cannot disagree (unresolved logo grouping, online definition). No existing field, route or function is renamed or removed.
- UI: rework `AdminDashboard.vue`, `VerificationPanel.vue`, `AdminManageUserProfile.vue`; delete the Products tab from `AdminManageProductData.vue`; delete one section from `AdminSystemLogs.vue`.
- No Prisma schema change and no migration. `FlaggedScan.status` (`pending`, `awaiting_rescan`, `approved`, `dismissed`) and `FlaggedScan.updated_at` already carry everything the Resolved tab needs.

Scope: `omniscan-ui/src/views/admin/*`, `nitro-app/server/api/admin/*`, and two new files under `nitro-app/server/utils/`.

### Findings from reading the code that shape the design

1. The queue groups pending flags by `scan.product.product_name` (fallback key `flag-<id>`), keeping only rows whose `flag_reason` matches the halal keywords. The Dashboard's current "Pending flags" counts flagged scans (not groups) and uses the same keyword filter. The unresolved logo number must therefore come from the queue's grouping, not from `flaggedScan.count`.
2. Online is defined only inside `users.get.ts`: `session_token` not null AND `last_active >= now - 2 min` (constant `ONLINE_WINDOW_MS`). The Dashboard has no online concept today.
3. `users.get.ts` supports `status=online|offline|active|inactive|archived` and `sort=newest|oldest` only. `sort=online` has no server meaning, so it is a UI alias for the status filter.
4. `AdminManageProductData.vue` reads `?tab=` on mount (`products` and `halal` are special-cased, anything else loads `allergen`). The real route is `/admin/productsdata` (name `admin-productsdata`), tab key `halal`. So `/admin/productsdata?tab=halal` is confirmed.
5. Dashboard charts are hand-written inline SVG (donut, area). There is no chart library in `omniscan-ui/package.json`. The vertical bar chart will be plain HTML/CSS.
6. Persistence gap (important for the Resolved tab): `VerificationPanel.vue` does not call `POST /api/admin/flagged-scans/:id/approve` or `/dismiss`. "Confirm and add" posts only to `/api/halal_logo`, and "Confirm" on Not a Halal certifier only hides the card locally (`resolvedIds`), so after a reload the card returns and nothing ever becomes `approved`/`dismissed`. Requirement 3.4 describes those effects as existing behavior, but the panel does not trigger them. Without persisting decisions the Resolved tab would stay empty. This design therefore wires the existing approve/dismiss endpoints into the two confirm handlers (endpoints themselves unchanged). This is a confirmed decision (bugfix.md A11, clauses 1.14 and 2.13), not an open question. See Fix Implementation, section D.

## Glossary

- **Bug_Condition (C)**: Any admin-portal state or navigation that deviates from the mock (listed in `isBugCondition` below).
- **Property (P)**: The admin portal renders and behaves as the mock/requirements 2.x describe.
- **Preservation**: Behavior in requirements 3.x that must not change.
- **Unresolved logo**: One group of pending halal-type `FlaggedScan` rows sharing a product name (queue card). Count = number of groups; covered scans = number of rows in those groups.
- **Resolved logo**: One group of `FlaggedScan` rows with status `approved` or `dismissed`, grouped by the same key.
- **Online consumer**: non-deleted user with `session_token` set and `last_active` within the last 2 minutes.
- **Library logo**: any row returned by the Halal Logo Library list (`prisma.halalLogo.findMany`, which applies no filter).
- **Halal logo scan count**: number of `Scan` rows whose `product_id` has a non-deleted `ProductHalalLogo` link to that logo.
- **F / F'**: code before / after the fix.

## Bug Details

### Bug Condition

The bug manifests whenever an admin opens one of the affected screens (or navigates with the affected query) and the screen contains an unwanted element, lacks a wanted element, or ignores a query parameter.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AdminPortalInteraction { route, query, user_action }
  OUTPUT: boolean

  RETURN (input.route = '/admin/productsdata'  AND productsTabShown(input)
                                               OR input.query.tab = 'products' opens Products)
      OR (input.route = '/admin/systemlogs' AND input.query.tab = 'flag-audit'
                                           AND timesScansFlaggedSectionShown(input))
      OR (input.route = '/admin/verification' AND (metricCardsShown(input)
                                               OR NOT resolvedTabShown(input)
                                               OR input.query.tab = 'resolved' AND NOT resolvedListShown(input)))
      OR (input.route = '/admin/dashboard' AND (totalScansCardShown(input)
                                               OR NOT unresolvedLogosCardShown(input)
                                               OR NOT totalConsumersCardShown(input)
                                               OR NOT onlineNowCardShown(input)
                                               OR NOT scansByHalalLogoChartShown(input)
                                               OR scanVerdictsPanelShown(input)
                                               OR subtitleIsFlagCount(input)
                                               OR allergenViewAllTarget(input) != '/admin/systemlogs?tab=flag-audit'))
      OR (input.route = '/admin/systemlogs' AND input.query.tab = 'flag-audit'
                                           AND NOT allAllergensListed(input))   // top-8 limit, 0-count rows hidden, no name tiebreak
      OR (input.route = '/admin/verification' AND input.user_action IN ('confirmAdd', 'confirmNotHalal')
                                               AND NOT decisionPersisted(input))
      OR (input.route = '/admin/usersprofile' AND (scansColumnShown(input)
                                               OR (input.query.status = 'online' OR input.query.sort = 'online')
                                                  AND NOT onlineFilterApplied(input)))
END FUNCTION
```

### Examples

- Dashboard: shows "Total scans 214" first and "Pending flags 31" (flag rows). Expected: "Unresolved logos 22 / distinct logos, covering 31 scans", no Total scans card.
- Dashboard "Online now" does not exist; clicking it must open `/admin/usersprofile?status=online` with "Online" selected on page 1.
- Dashboard shows a "Scan verdicts" donut with the total in its center. Expected: panel absent; only "Scans over time" and "Halal certifiers needing attention" follow the chart row. The API still returns `scan_verdicts`.
- Flag Audit with 12 predefined allergens shows 8 rows. Expected: all 12 rows, e.g. `Milk 5 (2.5%)` ... `Lupin 0 (0.0%)`, ties ordered by name (`Egg 3`, `Soy 3`, not server insertion order).
- Dashboard "Allergens listed by Consumers" > "View all" already opens `/admin/systemlogs?tab=flag-audit`, but the chart there is cut at 8, so "View all" does not show all. Expected: same link, full list. The Dashboard card keeps its own top 8.
- Dashboard has no Halal chart. Expected: vertical bars for all 9 library logos, e.g. `JAKIM 12 (60.0%)`, `MUI 8 (40.0%)`, `IDCP 0 (0.0%)`. With 0 total scans every bar is `0 (0.0%)` and nothing divides by zero.
- Verification Panel: three metric cards plus a single "Unmatched logos · N" tab. Expected: no cards, tabs "Unresolved 22" and "Resolved 5".
- `/admin/usersprofile?status=online` today shows "All statuses" and the full list.
- `/admin/productsdata?tab=products` today opens Products. Expected: opens Allergen Dictionary.
- Edge: `/admin/usersprofile?sort=online&status=offline` — `status` wins (explicit status), `sort=online` only acts when no `status` is present.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Allergen Dictionary, Halal Logo Library, Ingredient Mappings tabs, their badges and `?tab=halal` / `?tab=allergen`.
- All `/api/admin/products*` endpoints, Product rows, scan dedup, alternatives, product merge endpoint.
- System Logs Overview / API Latency / audit log; the Flag Audit "Consumers who listed each allergen" section, its title, subtitle, bar styling and `?tab=flag-audit` handling; `/api/admin/flag-audit-stats` response shape (field names and item shape) unchanged. Only the list length (no top-8 cut) and the tie order change.
- Verification Panel Unresolved tab: title, subtitle, card layout, expand/Review, dialogs, pagination, `?card=` and `?tab=needs-decision`.
- Manage User Profiles search, sort, status filter, pagination, lifecycle cards, row actions; `/api/admin/users` response including `scan_count`.
- Dashboard "Allergens listed by Consumers" card (its current top N data) and bar navigation; the "View all" link keeps its target `/admin/systemlogs?tab=flag-audit`.
- Dashboard "Scans over time" (7/30/90), "Halal certifiers needing attention". (The "Scan verdicts" panel is removed from the UI; the `scan_verdicts` API field stays.)
- Admin auth and single-session SSE.
- Dark mode via `html.ion-palette-dark .x`; `dark-mode.css` untouched.

**Scope:**
Inputs that do not hit the screens/queries in `isBugCondition` are unaffected. On the API side, any request that omits the new query parameters (`status` on the queue) receives all existing fields with identical values.

## Hypothesized Root Cause

These are not code defects but spec drift plus missing capability:

1. **Stale UI composition**: views still contain panels the product owner removed (Products tab, flag-count chart, metric cards, Total scans card, SCANS column).
2. **Missing data**: `dashboard.get.ts` has no unresolved-logo, online or per-logo scan data; `verification-queue.get.ts` has no resolved list and groups logic lives only inside the handler, so the Dashboard cannot reuse it.
3. **Online definition trapped in one handler**: `ONLINE_WINDOW_MS` is private to `users.get.ts`.
4. **No query handling**: `AdminManageUserProfile.vue` never reads `route`; the verification watcher only knows `needs-decision`.
5. **Decisions not persisted**: the panel never calls approve/dismiss, so "resolved" is never recorded (finding 6).

## Correctness Properties

Property 1: Bug Condition - Admin portal matches the approved mock

_For any_ interaction where the bug condition holds (isBugCondition returns true), the fixed portal SHALL: hide the Products tab and open the default tab for `?tab=products`; omit "Times scans were flagged"; omit the Verification metric cards and show "Unresolved N" / "Resolved M" tabs with a read-only Resolved list showing outcome and decided date; omit the Total scans card and the Scan verdicts panel (donut and center total) and show "Unresolved logos", "Total Consumers", "Online now" cards plus a vertical "Scans by Halal logo" chart listing every library logo (zero-scan included, percent = count / sum of all counts, 0 when sum is 0) that navigates to `/admin/productsdata?tab=halal`; omit the SCANS column; and apply `?status=online` / `?sort=online` on load and on query change with "Online" selected on page 1. The Dashboard "Allergens listed by Consumers" "View all" SHALL open System Logs > Flag Audit, whose "Consumers who listed each allergen" chart SHALL list every allergen of the dictionary (0-count rows shown as `0 (0.0%)`), sorted by count desc then name asc. Confirming a Verification decision SHALL persist it via the approve/dismiss endpoints. The Dashboard unresolved numbers SHALL equal the Verification Panel's `needs_decision` and `needs_decision_scans` for the same data, and the Dashboard online count SHALL use the same definition as `users.get`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13**

Property 2: Preservation - Everything outside the bug condition is unchanged

_For any_ input where the bug condition does NOT hold, the fixed code SHALL produce the same result as the original: all existing API response fields keep their names and values (new fields are additive), `/api/admin/users` and `/api/admin/flag-audit-stats` are identical in shape (the latter only differs by tie order of already-present items), `scan_verdicts` stays in the dashboard response, the Unresolved queue (cards, ids, order, titles, pagination, deep links) is unchanged, kept Dashboard panels ("Scans over time", "Halal certifiers needing attention", "Allergens listed by Consumers" with its current top N) render the same data, and the existing test suites pass.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13**

## Fix Implementation

### A. Shared server helpers (new files, additive)

**`nitro-app/server/utils/onlineStatus.ts`**
- `export const ONLINE_WINDOW_MS = 2 * 60 * 1000`
- `export function onlineSince(now: Date): Date`
- `export function onlineWhere(now: Date)` returns `{ session_token: { not: null }, last_active: { gte: onlineSince(now) } }`
- `export function isOnline(user, now)` mirrors the per-row expression in `users.get.ts`.
- `users.get.ts` imports these instead of its local constant and inline objects. Behavior must stay identical; `account-lifecycle.preservation.test.ts` (imports `users.get`) must keep passing. Offline filter and `is_online` row field keep working through the same helpers.

**`nitro-app/server/utils/flagGroups.ts`**
- Move `HALAL_KEYWORDS`, `isHalalReason`, and the group key rule (`scan.product.product_name || 'flag-' + id`) here.
- `groupFlagsByLogo(rows)` returns `Map<string, Row[]>` in first-seen order (same iteration order as today, so card numbering "#N" is unchanged).
- `getUnresolvedLogoSummary(db = prisma)` returns `{ logoCount, scanCount }`: loads pending flags with a light select (`id`, `flag_reason`, `scan.product.product_name`, no base64), filters `isHalalReason`, groups, counts groups and rows.
- `verification-queue.get.ts` uses `isHalalReason` and `groupFlagsByLogo` from the helper (cards built exactly as now). `dashboard.get.ts` keeps its own local `isHalalReason` for the existing `pending_flags` math (or imports the shared one; same keyword list).

### B. `GET /api/admin/dashboard` (additive fields)

Add to `stats` (existing keys untouched):
- `unresolved_logos: number`, `unresolved_logo_scans: number` from `getUnresolvedLogoSummary()`.
- `total_consumers: number` = `prisma.user.count({ where: { deleted_at: null } })` (same query as `active_consumers`; reuse the value).
- `online_consumers: number` = `prisma.user.count({ where: { deleted_at: null, ...onlineWhere(now) } })`.

Add top-level `halal_logo_scans`:
```
{ total: number,
  logos: [{ id, certifier, full_name, count, pct }]  // every library logo, sorted by count desc then certifier asc
}
```
- Logos: `prisma.halalLogo.findMany({ select: { id, certifier, full_name } })` with no filter, matching what the library list shows.
- Counts: `prisma.productHalalLogo.findMany({ where: { deleted_at: null }, select: { product_id, halal_logo_id } })` joined in memory with `prisma.scan.groupBy({ by: ['product_id'], _count: { _all: true } })`. A scan of a product with two logos counts once for each logo; `total` is the sum of the per-logo counts so percents add to 100.
- `pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0` (no division by zero; UI shows `pct.toFixed(1)`).
- `ProductHalalLogo` is the source of truth (approve writes both it and the legacy `Product.halal_logo_id`).

Fields that become unused by the UI but MUST remain for compatibility: `stats.total_scans`, `stats.pending_flags`, `stats.active_consumers`, `stats.resolution_rate`, `stats.api_latency_ms`, `stats.trends.*`, `stats.sparklines.*`, `ai_confidence_distribution`. `scan_verdicts` also becomes unused by the UI (the Scan verdicts panel is removed) but STAYS in the response with the same value (no field removal). Still used: `scans_over_time`, `allergen_distribution`, `attention_certifiers`.

### C. `GET /api/admin/verification-queue` (resolved support)

Decision: same endpoint, new optional query `status=unresolved|resolved` (default `unresolved`). Extra fields rather than a new route keeps one polling point and the existing `?page&pageSize`.

- `metrics` gains `resolved_logos` and `resolved_logo_scans` (always present, so both tab labels render from one call). Existing `needs_decision`, `needs_decision_scans`, `resolved_this_week`, `auto_resolved_pct`, `awaiting_rescan` unchanged.
- Default mode: response identical to today plus the two new metrics, plus `resolved: []`.
- `status=resolved`: `unmatched` is `[]`, `resolved` holds the page of resolved cards, and `pagination` describes the resolved list (same page clamp logic).
- Resolved grouping: flagged rows with `status in (approved, dismissed)` and `isHalalReason`, light select first (`id`, `status`, `updated_at`, `scan.user_id`, `scan.product.id/product_name`), grouped by the same key, ordered by newest decision first. Thumbnails (`logo_crop_base64`, product image) are fetched only for the groups on the requested page to avoid loading every resolved base64 blob.
- Resolved card = existing `Card` fields plus `outcome: 'approved' | 'dismissed'`, `outcomeLabel: 'Added to certifier registry' | 'Not a Halal certifier'`, `decidedAt: ISO string`. Outcome and date come from the row with the latest `updated_at` in the group. Title keeps the `Unrecognized Halal logo #N` style, numbered within the resolved list.
- A product name can have both pending and resolved rows; it then appears in both lists (each list counts only its own rows). This is intended and documented.
- Deep links: `?card=` and `?tab=needs-decision` unchanged; new `?tab=resolved` selects the Resolved tab.

### D. `VerificationPanel.vue`

1. Remove the `queue-metrics` block and its `.qm-*` CSS and the `queueMetrics` computed (keep `metrics` ref; tab labels read `metrics.needs_decision` and `metrics.resolved_logos`).
2. Tabs: `Unresolved {{ n }}` and `Resolved {{ m }}` as pill buttons (`role="tablist"` / `role="tab"` / `aria-selected`). `TabType = 'unmatched' | 'resolved'`; default `unmatched`.
3. `fetchQueue()` sends `status=resolved` when the Resolved tab is active. Switching tabs resets `page` to 1, collapses any expanded card, and refetches.
4. Resolved card: same collapsed layout (thumb, title, meta), no "Review" and no decision buttons or impact banner. It shows an outcome badge ("Added to certifier registry" / "Not a Halal certifier") and "Decided {{ date }}". Empty state: "Nothing resolved yet." Same pagination bar.
5. Query handling: on mount and in the `route.query` watcher, `tab=resolved` selects Resolved, `tab=needs-decision` selects Unresolved; `?card=` handling unchanged and only applies on the Unresolved tab.
6. Persist decisions (finding 6), using existing endpoints and no endpoint changes:
   - `confirmAddCertifier`: after `POST /api/halal_logo` succeeds, call `POST /api/admin/flagged-scans/:id/approve` for every id in `card.rawIds` (with `halal_logo_id` when the create response provides it; otherwise without, which still records the approval and the audit event). Then refetch.
   - `confirmNotHalal`: call `POST /api/admin/flagged-scans/:id/dismiss` for every id in `card.rawIds` with `admin_correction` = the entered reason, then refetch. Keep the optimistic `resolvedIds` removal and the same toasts.
   - On partial failure show the existing dialog error pattern and refetch so the list reflects truth.
   - The create-response shape of `/api/halal_logo` POST must be checked while implementing (not read in this design); if it returns no id, approve without `halal_logo_id`.
7. Resolved cards never reuse `expandedId`, `openAddDialog` or `openNotHalalDialog`.

### E. `AdminDashboard.vue`

- Header subtitle: "{{ stats.unresolved_logos }} unresolved logos need your review." (skeleton while loading); click goes to `/admin/verification?tab=needs-decision`.
- Metric grid (3 cards, keep `.metric-grid`/`.metric-card`): 
  1. "Unresolved logos": value `unresolved_logos`, sub "distinct logos, covering N scans", click to `/admin/verification?tab=needs-decision`.
  2. "Total Consumers": `total_consumers`, sub "registered accounts", click to `/admin/usersprofile`.
  3. "Online now": `online_consumers`, sub "of {{ total_consumers }} Consumers", click to `/admin/usersprofile?status=online`.
  Remove the Total scans, Pending flags and Active Consumers cards. Cards become keyboard reachable (`role="link"`, `tabindex="0"`, Enter/Space).
- Row order: row 2 keeps "Allergens listed by Consumers" and puts "Scans by Halal logo" in the position the "Scan verdicts" donut had; "Scans over time" and "Halal certifiers needing attention" follow below (kept, per A2). The "Scan verdicts" panel (donut and its center total) is REMOVED from the template together with its now-dead refs/handlers only if grep shows no other use; the `scan_verdicts` API field is untouched and may still be read into a local ref. Layout: `chart-row--2col` with Allergens and Halal chart, then Scans over time, then the certifier list. "Allergens listed by Consumers" "View all" `router-link` keeps `to="/admin/systemlogs?tab=flag-audit"` (verified in code; do not change it).
- Types: extend `DashboardStats` with the four new optional-safe numbers and add `HalalLogoScans`; read defaults as `?? 0` / `?? []` so an old server response never breaks the page.

**Vertical bar chart (HTML/CSS, no dependency):**
- Container `.halal-chart` is a `role="group"` card with `aria-labelledby` the title. Header has a visible "Manage" link (`router-link` to `/admin/productsdata?tab=halal`).
- Bars area: flex row, `overflow-x: auto`, each bar column `min-width: 56px`; with 9+ logos it scrolls instead of crushing labels.
- Each bar is a `<button type="button" class="hb-bar">` (natively focusable, Enter/Space activates) with `aria-label="{{ certifier }}: {{ count }} scans, {{ pct }} percent. Open Halal Logo Library"`. Bar height = `count / max(count, 1) * 100%` of the track; a 0-count bar gets `min-height: 4px` so it reads as an empty/minimal bar. Label above: `count (pct.toFixed(1)%)`, e.g. `0 (0.0%)`; certifier code below, `title` holds `full_name`.
- Clicking the bar, the card background, or "Manage" calls `router.push('/admin/productsdata?tab=halal')`. The card background click is a mouse convenience only; keyboard users use the bars and the Manage link, so there is no nested focusable-in-focusable.
- States: skeleton while loading, empty note "No Halal logos in the library yet." when `logos.length = 0`.
- Dark mode: scoped CSS only with `html.ion-palette-dark .halal-chart ...` selectors (card background, border, text, track, bar color, focus ring). Never `:global()`. `dark-mode.css` is not edited. Focus ring uses `:focus-visible` with a 2px outline contrasting in both themes.
- Remove now-dead Dashboard code only if unreferenced after the change (`goToVerification`, `sparklinePoints`, `.flag-table`, etc. are already unused and may be left alone to keep the diff small).

### F. `AdminManageUserProfile.vue`

- Import `useRoute`. Add `applyQueryFilters()`: reads `route.query.status`, falls back to `route.query.sort`; if either lowercases to `online` (status takes precedence when both present), set `filterStatus = 'Online'`; for `status=offline` set `'Offline'`; otherwise leave unchanged.
- Call it in setup before `onMounted(fetchUsers)` and before the `watch([filterStatus, sortOrder])` is registered, so the first request already carries `status=Online` with no double fetch. Page starts at 1 already.
- `watch(() => route.query, ...)`: re-apply; if `filterStatus` changed, the existing watcher resets to page 1 and fetches; if it did not change, call `resetAndFetch()` so the page returns to 1.
- The dropdown is `v-model="filterStatus"`, so "Online" is shown automatically.
- Remove the SCANS `<th>` and `<td class="scan-count-cell">` from the main table, the SCANS `<th>` and its skeleton `<td>` (the 30px-wide cell) in the skeleton table, and the now-unused `.scan-count-cell` CSS. Keep `scan_count` in the `UserRow` type (the API still sends it). The lifecycle tables (LAST ACTIVE / ARCHIVED / DELETES) have no SCANS column and are untouched.
- Server: no change. `sort=online` is purely a UI alias; the server ignores unknown sort values.

### G. `AdminManageProductData.vue`

- Remove the Products tab button, the `<template v-else-if="activeTab === 'products'">` panel, and `'products'` from `TabType`.
- Remove Products-only state and functions after a reference check (`fetchProducts`, `productList`, `productTotal*`, `productTabBadge`, `productSearch`, `productSort`, `productLoading`, `productError`, `productAllergenFilter`, `productPage`, `filteredProductList`, `productRangeLabel`, merge helpers `openMerge` and the merge request, and the Products branch of `fetchTabCounts`, `fetchTabContent`, `getTabTitle`). Rule: delete a symbol only when `grep` shows no remaining reference outside the removed panel; anything shared with Allergen/Halal/Ingredient stays. `vue-tsc` (unused locals are not errors here) and a grep for `product[A-Z]` verify nothing dangling.
- `onMounted`: drop the `tabParam === 'products'` branch. `?tab=products` falls into the existing `else` and loads `allergen`; `?tab=halal` is unchanged.
- Products CSS and the `/api/admin/products*` endpoints stay (endpoints untouched; CSS removed only if exclusively Products).

### H. `AdminSystemLogs.vue`

- Delete the `fa-flag-section` block ("Times scans were flagged", its rows, the expanded "MOST FLAGGED PRODUCTS" panel and the `?tab=products` link).
- Remove now-unused `expandedAllergen`, `toggleAllergen`, `maxFlagCount`, `formatFlagDate` (if exclusively used there) and `.fa-flag-*`, `.fa-expand*`, `.fa-product-*` CSS. Keep `AllergenFlagCount` typing and `allergen_flag_counts` in the response interface (the response shape stays).
- "Consumers who listed each allergen" section and `flagStats` loading stay, except the top-8 limit, which is removed (see section I). After this change it is the only chart on the tab.

### I. Flag Audit lists all allergens + Dashboard "View all" link

Findings from reading the code:
- `AdminDashboard.vue`: "View all" is `<router-link to="/admin/systemlogs?tab=flag-audit" class="view-all-link">`. It already targets Flag Audit. No change to the target (folded into task 3.5 only as "keep, add a source assertion").
- `AdminSystemLogs.vue`: `onMounted` reads `route.query.tab` against `VALID_TABS` (`overview`, `api-latency`, `flag-audit`) and sets `activeTab`, then calls `fetchFlagStats()` when it is `flag-audit`. The list is limited in the UI only: `topProfileAllergens` returns `allergen_profile_counts.slice(0, 8)`.
- `flag-audit-stats.get.ts`: does NOT truncate. `allergen_profile_counts` comes from `allergen.findMany({ where: { is_predefined: true } })` (no `take`, no `slice`), so 0-count allergens are already in the response. Its sort is `b.user_count - a.user_count` only, with no name tiebreak, so tie order depends on database order.

Changes:
- **Server (`nitro-app/server/api/admin/flag-audit-stats.get.ts` only)**: change the sort of `allergen_profile_counts` to count desc, then `name.localeCompare` asc. Response field names, item shape and list membership stay the same. No `take` / `slice` exists, so no limit is removed. During implementation, confirm "allergen dictionary" = `is_predefined: true` by checking how the Allergen Dictionary tab lists rows (`AdminManageProductData.vue` and its allergens endpoint); if the dictionary also includes non-predefined rows, include them additively in the same list and keep the field names.
- **UI (`AdminSystemLogs.vue`, folded into task 3.8)**: `topProfileAllergens` returns the full sorted list (copy sorted by `user_count` desc, then `name` asc, defensive against older server order); drop `.slice(0, 8)`. Keep the name `topProfileAllergens` (no renames). Rows render `{{ user_count }} ({{ profilePct }}%)`; with 0 Consumers this is `0 (0.0%)` (`profilePct` returns `'0'` only when `total_active_consumers` is 0, so use `toFixed(1)` for that case too: `'0.0'`). The list sits in the existing section, with the page scrolling normally (no inner scroll box).
- **Dashboard (folded into task 3.5)**: the "Allergens listed by Consumers" card keeps its current top N (`allergen_distribution` is `slice(0, 8)` in `dashboard.get.ts`, unchanged). "View all" target unchanged.
- Deep link: `?tab=flag-audit` is already handled on mount. If the admin is already on System Logs and clicks a link to the same route with a new query, the page does not re-read the query. This is not reachable from the Dashboard (different route), so no watcher is added.

### Schema / migration

No schema change and no migration are required.

## Testing Strategy

### Validation Approach

Two phases: first exploration tests that fail on unfixed code and name the exact defect, then fix-checking and preservation tests. Run vitest from an UPPERCASE drive letter:

`cmd /c "cd /d C:\Users\Zarrin\Desktop\Projects\nitro-app && npx.cmd vitest run > out.txt 2>&1"`

Baseline: 26 files / 252 tests. omniscan-ui `vue-tsc` must show only the 6 known errors (`src/utils/appBadge.ts`, `src/utils/reminderScheduler.ts`). Delete `out.txt` after reading.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples before the fix.

**Test Plan**: Add `nitro-app/server/tests/admin-portal-dashboard-cleanup.bug.test.ts` following the existing patterns (`vi.mock` of `../lib/prisma` and `requireAdminAuth`, call the default handler with a fake h3 event, as in `account-lifecycle.*.test.ts`; source-level checks read `.vue` files with `fs.readFileSync` like `help-faq.source.test.ts` and `ui-bugcondition.test.ts`).

**Test Cases**:
1. **Dashboard fields (handler, mocked prisma)**: response `stats` must include `unresolved_logos`, `unresolved_logo_scans`, `total_consumers`, `online_consumers`, and `halal_logo_scans.logos` containing a zero-count logo (fails: fields missing).
2. **Queue resolved mode (handler)**: `?status=resolved` returns `resolved` cards with `outcome`/`decidedAt`, and `metrics.resolved_logos` (fails: absent).
3. **Source: Dashboard** has no `Total scans` label, no `Scan verdicts` panel title, links "View all" to `/admin/systemlogs?tab=flag-audit`, has `Unresolved logos`, `Total Consumers`, `Online now`, `Scans by Halal logo`, and navigates to `/admin/productsdata?tab=halal` (fails).
4. **Source: Verification Panel** has no `Auto-resolved by AI` / `Resolved this week` cards and has `Resolved` tab text (fails).
5. **Source: Manage User Profiles** has no `>SCANS<` header or `scan-count-cell`, and reads `route.query` for `online` (fails).
6. **Source: Manage Product Data** has no `switchTab('products')` and no `Products` tab (fails).
7. **Source: System Logs** has no `Times scans were flagged` (fails).
8. **Persistence (source)**: `VerificationPanel.vue` references `/approve` and `/dismiss` (fails).
9. **Flag Audit all allergens (source)**: `AdminSystemLogs.vue` `topProfileAllergens` has no `.slice(0, 8)` (fails: slice present).
10. **Flag Audit server order (handler, mocked prisma)**: with 12 predefined allergens including ties and 0-count rows, `allergen_profile_counts` has length 12, includes every 0-count allergen, and is sorted by `user_count` desc then `name` asc (fails on ties: no name tiebreak). Response keys unchanged.
11. **Dashboard API keeps `scan_verdicts`**: handler response still contains `scan_verdicts` (passes before and after; guards against field removal).

**Expected Counterexamples**: missing fields/labels as above. Causes: stale views and handlers lacking the data (see root cause).

### Fix Checking

**Goal**: For all inputs where the bug condition holds, the fixed code gives the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedPortal(input)
  ASSERT expectedBehavior(result)
END FOR

FUNCTION expectedBehavior(result)
  RETURN result matches requirements 2.1 .. 2.10
     AND dashboard.unresolved_logos = queue.metrics.needs_decision
     AND dashboard.unresolved_logo_scans = queue.metrics.needs_decision_scans
     AND dashboard.online_consumers = count(users WHERE is_online per users.get)
     AND halal_logo_scans.logos.length = libraryLogoCount
     AND halal_logo_scans.logos[i].pct = 0 WHEN halal_logo_scans.total = 0
END FUNCTION
```

### Preservation Checking

**Goal**: For all inputs where the bug condition does NOT hold, fixed output equals original output.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalPortal(input) = fixedPortal(input)
END FOR
```

**Testing Approach**: Property-based tests (fast-check if already a dev dependency of nitro-app; otherwise table-driven loops over generated inputs) for handler outputs, plus source checks for UI.

**Test Plan**: Observe on unfixed code, then assert after the fix.

**Test Cases**:
1. **Existing dashboard fields**: all original keys of `stats`, `scan_verdicts`, `scans_over_time`, `allergen_distribution`, `attention_certifiers`, `ai_confidence_distribution` still present with equal values for the same mocked rows.
2. **Queue default mode**: without `status`, `unmatched`, `pagination`, `metrics.*` (original keys), `duplicates`, `training` equal pre-fix output; card ids/titles/order for random pending-flag sets are identical to the old inline grouping.
3. **Users API**: `account-lifecycle.preservation.test.ts` (imports `users.get`) passes unchanged; online/offline filter `where` and `is_online` rows identical; `scan_count` still returned.
4. **Flag audit**: `/api/admin/flag-audit-stats` output unchanged.
5. **Source preservation**: Allergen/Halal/Ingredient tab markup and `?tab=halal` branch remain; kept Dashboard panels ("Scans over time", "Halal certifiers needing attention", "Allergens listed by Consumers" with its `slice(0, 8)` data) remain, and `dashboard.get.ts` still returns `scan_verdicts` and the top-8 `allergen_distribution`; `flag-audit-stats` keys (`allergen_profile_counts`, `allergen_flag_counts`, `total_active_consumers`) and item shapes unchanged; approve/dismiss endpoint files unmodified.
6. **Dark mode**: new styles use `html.ion-palette-dark` selectors; no `:global(` in the changed files; `dark-mode.css` has no diff.

### Unit Tests

- `groupFlagsByLogo` / `getUnresolvedLogoSummary`: grouping by product name, `flag-<id>` fallback, non-halal reasons excluded.
- `onlineWhere` / `isOnline`: boundary at exactly 2 minutes, null `session_token`, null `last_active`.
- Halal chart math: zero total gives `pct = 0` for every bar; counts sum to total; products with two logos count for each; zero-scan logos present; sort by count desc then name.
- Queue resolved: outcome from latest `updated_at` in a group, pagination clamp, thumbs fetched only for the page.
- UI helper for query parsing in the user list: `status=online`, `sort=online`, both present, unknown values.

### Property-Based Tests

- For random sets of pending flags, `getUnresolvedLogoSummary` equals the queue's `needs_decision` / `needs_decision_scans`.
- For random scans/links/logos, `sum(pct)` is 100 (±0.1 rounding) when total > 0 and every `pct` is 0 when total is 0; `logos.length` always equals the library size.
- For random user sets, dashboard `online_consumers` equals the count of rows `users.get` marks `is_online`.
- For random queue inputs without `status`, old and new handlers return equal `unmatched` cards.

### Integration Tests

- Dashboard "Online now" click lands on `/admin/usersprofile?status=online` and the first `/api/admin/users` request has `status=Online`, page 1.
- Verification flow: Not a Halal certifier confirms, dismiss called per `rawIds`, card leaves Unresolved, counts update, card appears on Resolved with the "Not a Halal certifier" outcome and a decided date.
- `?tab=resolved` and `?tab=needs-decision` deep links; `?card=` expands on Unresolved.
- Dashboard "Allergens listed by Consumers" > "View all" opens System Logs on the Flag Audit tab, which lists every allergen (0-count rows as `0 (0.0%)`), sorted by count desc then name, and shows no second chart.
- `?tab=products` on Manage Product Data opens Allergen Dictionary; `?tab=halal` opens the Halal library.
- Manual check in dark mode for the cards, the vertical chart (including focus ring) and the tabs, and keyboard-only operation of the chart bars.

### Reminders for execution

- Write and run the exploration tests BEFORE implementing the fix, on UNFIXED code, to confirm and understand the failures.
- Use the observation-first method for preservation tests: record the original outputs first, then assert them.
