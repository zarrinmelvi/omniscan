![alt text](image.png)# OmniScan — To-Do List

Last updated: November 2026

This file tracks all pending work across the OmniScan project. Items are grouped by area and priority. Specs with a tasks.md are linked for implementation.

---

## 🟥 HIGH PRIORITY — Consumer App Bugs

### Scan & Camera
- [ ] Camera permission not working — fix camera access request flow
- [ ] Blurry photos being accepted — add blur/quality detection gate before sending to AI
- [ ] Front photo (product name only, no ingredients) rejected as first scan — should accept product name OR ingredients as valid first capture; don't require both upfront
- [ ] Scanned modal slide-down: dismissal shows "unsaved item" alert; tapping "Keep editing" does not reopen the modal — fix so the modal comes back

### Registration / Profile
- [x] **Registration form enhanced with Gender & Birthday fields + Google Sign-Up Terms Gate** — Added required Gender dropdown (Male/Female/Other/Prefer not to say) and Birthday date picker with 16+ age validation; Google OAuth now redirects to registration page for new users to complete profile before account creation; Terms modal appears on Continue for both password and Google flows; account only created after Terms acceptance; implemented full state management and validation

### Pantry / Scan Result
- [ ] Auto-detect storage location based on food category (e.g. Dairy → Fridge, Canned Goods → Cupboard, Ice cream → Freezer)
- [ ] Category dropdown in scan result modal not pre-filling even when food category is detected — category still shows "Uncategorized" despite food_category being returned by the backend

---

## 🟥 HIGH PRIORITY — Admin Portal Bugs

### UI Cleanup
- [ ] System Logs API Latency — refine Previous/Next pagination buttons (style them as proper buttons)
- [ ] Verification Panel — remove "Awaiting Consumer Rescan" metric card (no purpose currently)
- [ ] Remove bottom footer notes from: Manage User Profiles, System Logs API Latency, Manage Product Data (all tabs)
- [ ] Manage User Profiles — remove "Archives in X days" sub-text from Last Active column
- [ ] Manage User Profiles — Online/Offline status: show Online only when user is actively logged in (has a valid session), Offline otherwise

### Data / Logic
- [ ] Manage Product Data Products tab — duplicate products (e.g. "Afritada", "Adult Boost") should be automatically merged or flagged and auto-merged without manual admin action
- [ ] Halal Logo Library re-scrape — direct logo image link cannot be saved via Edit modal; fix so at least one certifier can re-scrape successfully
- [ ] Dashboard "Halal certifiers needing attention" card — clicking a row should navigate to `/admin/productsdata?tab=halal` (Halal Logo Library tab)

---

## 🟧 MEDIUM PRIORITY — Deferred / Backlog

### Manage Product Data
- [ ] Re-scrape Edit modal — clarify direct image URL vs official website URL
- [ ] Allergen filter select sizing and ingredient controls final mockup match

### System Logs
- [ ] Flag Audit tab — row expand/collapse chevron

### Verification Panel
- [ ] "Not a Halal certifier" and "Ask Consumers to rescan" — currently optimistic client-side only; wire to backend

### Session Management
- [ ] Wire `?reason=session_expired` to admin `handleUnauthorized` in api.ts so the amber banner appears on mid-use session expiry

---

## 🟦 SCAN (Consumer App) — Future Enhancements

- [ ] AI-detected food category shown on scan result and auto-fills pantry Category dropdown *(covered in admin-scan-portal-refinements)*
- [ ] Separate ingredients disclaimer as its own section *(covered in admin-scan-portal-refinements)*
- [ ] Third rescan condition — product name found but ingredients missing *(covered in admin-scan-portal-refinements)*

---

## ✅ COMPLETED — Reference

All of the following have been implemented, committed, and pushed to `main`:

### Core Features (Epics A–E)
- [x] Feature A — Manage User Profiles lifecycle view (account lifecycle cards, user table, pagination)
- [x] Feature B — Products tab + merge (product list, duplicate merge modal)
- [x] Feature C — Halal logo lifecycle (re-scrape, compare logos, mark checked, deactivate/reactivate)
- [x] Feature D — De-sample (all API data real, removed sample fallbacks)
- [x] Feature E — Ingredient Mappings (test box removed; mappings tab with group headers)

### Admin Portal UI
- [x] Admin Dashboard redesign (4-col metrics → 3-col, charts, flag table)
- [x] Dashboard bugs fixed (Total Scans route, View all link, donut fallback, histogram crash)
- [x] Verification Panel cleanup (Training tab, aside panel, Ask Consumers button removed)
- [x] System Logs full redesign (Overview / API Latency / Audit Log / Flag Audit tabs)
- [x] General Settings redesign (single-column, Appearance + Notifications cards)
- [x] Admin login page dark theme redesign with error banner
- [x] Browser tab title → "OmniScan Admin Portal"
- [x] Top-bar: session-time removed, dark/light toggle added
- [x] Manage Product Data spacing/sizing — unified spacing scale, consistent controls, tab counts
- [x] Manage Product Data — product detail modal removed (clicking a row does nothing)
- [x] Products allergen filter uses full allergen dictionary
- [x] Halal tab search + Add certifier button restored
- [x] Audit log page size → 10, uniform filter pill height
- [x] Dashboard recent flagged items deduplicated by product

### Dark Mode
- [x] Central `dark-mode.css` with all admin overrides
- [x] Admin login page light/dark mode (CSS variables, no more hardcoded dark)
- [x] Dark mode toggle synced between header and Settings via `useDarkMode()` composable
- [x] Admin login dark mode inputs — autofill webkit override, removed conflicting old block
- [x] Manage Product Data dark mode — table row hover, select/input backgrounds
- [x] Verification Panel brand color parity — `#05c450` → `#008744` everywhere
- [x] Dashboard time range chips — solid green when active, brand-tint hover

### Auth & Navigation
- [x] Email verification flow
- [x] Navigation + auth validation fixes
- [x] Session isolation + token guards (single-session enforcement)
- [x] Auth navigation bugfix (router guard for setup steps)

### Consumer App
- [x] Allergen scanning with personal profile matching
- [x] Pantry with expiration tracking
- [x] Recipes with saved favorites
- [x] Photo pantry upload (AI photo analysis)
- [x] Scan result modal — alternatives, allergen alerts, Halal badge
- [x] Simplified ingredients feature
- [x] Egg allergen matching fix
- [x] Upload allergen evaluation
- [x] Scan allergen confirmation parity
- [x] Scanner alternatives + profile overhaul
- [x] Unsaved changes confirmation
- [x] Responsive web design

### Admin Portal + Scan Refinements (spec: admin-scan-portal-refinements)
**Spec:** `.kiro/specs/admin-scan-portal-refinements/`
14 items covering admin portal UI cleanup, scan improvements, and backend fixes.

**Admin Portal:**
- [x] Fixed header — make top bar sticky while scrolling
- [x] Manage User Profiles — replace Active/Inactive/Archived status with Online/Offline; remove "Archived" from filter; remove "How this works" toggle
- [x] Dashboard — remove AI confidence distribution histogram card
- [x] Dashboard — remove trend lines ("▲ X% vs prior") and API Health metric card; 3-card grid only
- [x] Dashboard — replace "Recent flagged items" table with unverified/overdue Halal certifiers list
- [x] Verification Panel — remove "Possible duplicates" tab
- [x] Manage Product Data — fix product detail modal UI (when clicking a product row)
- [x] Dashboard metric card click redirects — verify all routing is correct
- [x] Re-scrape certifier logo fetcher — fix HTTP→HTTPS upgrade + better error handling
- [x] System Logs — reword "Degraded" to "Slow"

**Consumer Scan:**
- [x] Three rescan-prompt conditions: (a) label unreadable, (b) Halal logo detected but certifier unidentified, (c) NEW — product name found but ingredients missing
- [x] Ingredients disclaimer — separate amber section below the ingredients card (always visible)
- [x] Food category detection — AI detects food category, shown on scan result, auto-fills pantry Category dropdown

### Landing Page Enhancement (spec: landing-page-enhancement)
- [x] Create `dist/assets/` and copy `hero.webp`, `dashboard.webp`, `phone.webp`
- [x] Produce `dist/index.html` — corrected asset paths, meta description, aria-label, lazy loading
- [x] Wire `VUE_APP_URL` + `APK_URL` constants; Sign in → `/login`, Sign up/Get started → `/register`
- [x] APK download handler — coming-soon dialog when empty, direct download when set
- [x] Theme toggle with `aria-pressed` state
- [x] `dist/vercel.json` — `outputDirectory: "dist"`, 308 redirects for `/signin.html` and `/signup.html`
- [x] `README.md` with deploy instructions and operator config table

---

*This file is manually maintained. Update it as items are completed or new work is added.*
