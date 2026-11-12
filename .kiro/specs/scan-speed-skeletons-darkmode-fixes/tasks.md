# Implementation Plan

## Notes for executors (read first)

- **Shell is flaky on this machine.** Run nitro-app tests with `cmd /c "npx.cmd vitest run > out.txt 2>&1"` (cwd `nitro-app`), then read `out.txt`. Delete `out.txt` when done.
- **Type-check omniscan-ui**: `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit` (cwd `omniscan-ui`). Must stay clean.
- **Type-check nitro-app**: `node ../omniscan-ui/node_modules/typescript/bin/tsc --noEmit -p .` (cwd `nitro-app`). There are about 20 pre-existing unrelated errors. Compare against that baseline and introduce no new ones.
- **DO NOT run the migration, `prisma generate`, or the backfill script.** The agent only writes the migration SQL, the schema change and the backfill script. The user applies them manually from `nitro-app`:
  1. `node node_modules/prisma/build/index.js migrate deploy`
  2. `prisma generate`
  3. `prisma/backfill-product-thumbs.ts` (run by the user, once)
  Until the user does this, the generated client in `server/generated/prisma` does not know `image_thumb_base64`. Tests that touch handlers must mock `prisma`, and any type errors about `image_thumb_base64` before regeneration are expected and should be reported, not worked around with `any` casts that would persist.
- **omniscan-ui has no real component test setup.** Frontend verification is `vue-tsc` plus CSS/source assertions in nitro-app-style vitest files where practical (read the `.vue` source as text and assert on selectors). Do not set up a component test framework. Visual checks are manual and left to the user.
- **Decision kept from the design**: `Condiments & Sauces` and `Canned Goods` use the head-phrase rule, not literal exclusion.
- Do not modify `dark-mode.css`. Do not rename existing functions, routes or fields. Preserve commit 9bef136 behavior.
- Existing baseline: nitro-app vitest 9 files / 75 tests must keep passing.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Heavy Payloads, Processed-Item Matching, Missing Dark Rules and Skeletons
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate each defect group exists
  - **Scoped PBT Approach**: These bugs are deterministic, so scope properties to the concrete failing cases below
  - Put backend cases in nitro-app (for example `server/tests/scan-speed-bugcondition.test.ts`, mocking `prisma` in the style of the existing tests) and source/CSS assertions in a vitest file that reads omniscan-ui `.vue` files as text
  - Cases from the Bug Condition in design (`isBugCondition`):
    - D1 list: mock `prisma.pantryItem.findMany` with a product holding a 500 KB `image_base64`; assert no string in the `GET /api/pantry_item` response exceeds 50 KB
    - D1 scan: with the Ollama call mocked, assert `product.image_base64` is a thumbnail (decoded long edge at most 320) and `product.image_base64_back` is `null`
    - D1 create: `POST /api/pantry_item` response carries no full-size image
    - D3 matcher (use fast-check, add as pinned devDependency of nitro-app if absent): `matchIngredientsToPantry([{name:'lemon'}], [{id:1, product_name:'Lemon Iced Tea', category:'Beverages'}])` yields no match; same for "Lemon Flavored Chips" (`Snacks`), "Sprite Lemon" (`Beverages`), "Lemon Sauce" (`Condiments & Sauces`). Generalize: for any processed category and a partial-name match that is not a whole-product or allowed head-phrase match, expect no match
    - D4 source check: `ForgotPasswordPage.vue`, `ResetPasswordPage.vue`, `VerifyEmailPage.vue`, `CheckEmailPage.vue` each contain an `html.ion-palette-dark` rule setting `#0b160b` / `#172617`
    - D5 source check: `ScanPage.vue` has dark rules for `.back-prompt-text strong` and `.skip-btn`; `ScanResultModal.vue` has dark rules for `.alt-row__name`, `.alt-row__descriptor`, `.category-select` and `.field-label--strong`
    - D2 source check: `PantryItemDetail.vue`, `ProfilePage.vue`, `RecipeSuggestions.vue` loading branches use `SkeletonCard` and not a lone `ion-spinner`; `SkeletonCard.vue` has `hero`, `recipe`, `profile` variants
  - Optionally record a timing baseline for one scan (temporary logs, removed afterwards); do not make it a pass/fail test
  - Run on UNFIXED code using `cmd /c "npx.cmd vitest run > out.txt 2>&1"`
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found (for example "list response contains a 500 KB string", "Lemon Iced Tea matches lemon", "ForgotPasswordPage has no dark rule")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Raw Ingredient Matching, Response Shapes, Light Mode and Existing Suites
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code, then encode as tests:
    - Matcher: for pantry items with category `Dairy`, `Grains`, `Uncategorized` or `null`, record `matchIngredientsToPantry` and `findMatchingIngredientLine` outputs (fresh lemon, rice, eggs, flour, plurals/stems, word boundaries)
    - Matcher: whole-name matches in processed categories still match ("Coffee"/`Beverages`, "Soy Sauce"/`Condiments & Sauces`, "Kikkoman Soy Sauce" for "soy sauce", "Century Tuna" for "tuna")
    - Matcher partition: `matchedIngredients` + `missingIngredients` cover the input ingredients for any category mix
    - Response shapes: key sets of list, scan, POST and PUT responses (all keys other than the documented image fields and additive `needs_image`)
    - Scan semantics (9bef136): assert mock call patterns for the plain-text allergen skip, 8s semantic allergen timeout, alternatives started early and awaited before response, `Promise.all([logAuditEvent, logRecentActivity])`
    - Source checks: `dark-mode.css` is unmodified (hash or snapshot of the current content); `.quantity-input`, `.pieces-input`, `.unit-select` rules in `ScanResultModal.vue` unchanged; Login/Register dark rules unchanged; no light-mode rule changed in the touched `.vue` files
  - Use fast-check property tests for the matcher (generated names, categories, ingredients)
  - Run on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ] 3. Fix for scan speed, skeletons, recipe matching and dark mode defects

  - [x] 3.1 Group A: Image payloads and scan speed (nitro-app)
    - `prisma/schema.prisma`: add `image_thumb_base64 String?` to `Product` (additive, nullable)
    - Write the migration folder under `prisma/migrations` following the existing naming, with SQL `ALTER TABLE "Product" ADD COLUMN "image_thumb_base64" TEXT;` (check the existing table/column naming and `@@map` in the schema first). **Do NOT run `migrate deploy` or `prisma generate`**; the user does this manually
    - Create `server/lib/image-thumb.ts` with `makeThumbDataUri(input, maxEdge = 320, quality = 70)` using `sharp`: EXIF `rotate()`, `fit: 'inside'`, `withoutEnlargement`, JPEG; returns `null` on any failure and never throws
    - `server/api/scan/index.post.ts`: start the front-image thumbnail concurrently with the existing `Promise.all` (front buffer is the back field when `hasBackImage && front_image_index === 1`); store `image_thumb_base64` in `product.create` (full images still stored); add a `select` excluding `image_base64` and `image_base64_back`; respond with `image_base64: thumb` and `image_base64_back: null`; start `findCanonicalProduct` alongside the first `Promise.all`; run `productHalalLogo.createMany` with `scan.create`; run FlaggedScan create with the FLAG audit event (keep its `.catch`). Do not touch the allergen skip/timeout, alternatives start/await points, audit + activity `Promise.all`, halal rescan gate or thresholds
    - `server/api/pantry_item/index.get.ts`: select `image_thumb_base64` instead of `image_base64`; map to `product.image_base64`; add `needs_image` via one id-only query (`image_thumb_base64: null`, `image_base64: { not: null }`); keep ordering, serialization and `pagination`
    - `server/api/pantry_item/index.post.ts`: return the thumbnail as `product.image_base64`; for manual add, generate `image_thumb_base64` with `makeThumbDataUri` before `product.create`
    - `server/api/pantry_item/[id].put.ts`: select and return `image_thumb_base64` as `product.image_base64`
    - New `server/api/pantry_item/[id]/image.get.ts`: auth required, same 403/404 ownership rules as `[id].get.ts`, generate and persist the thumbnail if missing, return `{ success: true, image_base64 }`
    - New `prisma/backfill-product-thumbs.ts` in the style of the existing `backfill-*.ts` scripts: batches where `image_thumb_base64 IS NULL AND image_base64 IS NOT NULL`. **Write it only; the user runs it manually**
    - Add unit tests: `server/lib/image-thumb.test.ts` (JPEG data URI, long edge at most 320, returns `null` on bad input, EXIF rotation), handler tests for list/POST/PUT (no full-size image, `needs_image` correct), `[id]/image.get.ts` (401, 403, 404, generates and persists), scan handler (thumbnail from front image, `findCanonicalProduct` parallel with unchanged result)
    - _Bug_Condition: isBugCondition(X) where X.kind IN {PantryLoad, ScanResponse, PantryCreate} with a full-size product image in the response_
    - _Expected_Behavior: expectedBehavior(result) - product.image_base64 is a thumbnail data URI (long edge at most 320) or null; image_base64_back is null in scan; other fields unchanged_
    - _Preservation: 9bef136 scan behavior, response field names, GET /api/pantry_item/:id full image, pagination block, admin endpoints_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3_

  - [x] 3.2 Group B: Pantry list cache and thumbnails in the UI (omniscan-ui)
    - Create `src/composables/usePantryList.ts` with module-level cache: `items`, `isFirstLoad`, `loadError`, `refresh({ silent })` (dedupes in-flight requests, keeps cached data visible), `invalidate()`, `upsert(item)` (preserves `product.image_base64` when the incoming product has none)
    - `PantryPage.vue` and `HomePage.vue` read the list through it; `onIonViewWillEnter` calls `refresh({ silent: true })`; skeletons only on cold first load; `confirmConsume`/`restoreItem` use `upsert`; call `invalidate()` after DELETE/PUT
    - `ScanResultModal.submitAddToPantry` and `PhotoPantryUploadModal` call `invalidate()` after a successful POST
    - Lazy fallback: for cards with `product.needs_image === true`, request `/api/pantry_item/:id/image` via `apiFetch` when the card scrolls into view (IntersectionObserver, immediate load as fallback) and store the result in the cache
    - Add optional `needs_image?: boolean` to the `Product` interfaces in `PantryPage.vue` and `HomePage.vue`
    - Verify with `vue-tsc --noEmit` (command in the notes above)
    - _Bug_Condition: isBugCondition(X) where X.kind = PantryLoad with redundant refetches and heavy per-item data_
    - _Expected_Behavior: expectedBehavior(result) - single shared request, instant render on warm cache, images still shown_
    - _Preservation: Pantry and Home display the same data; silent refresh; archive/restore keeps the picture_
    - _Requirements: 1.2, 2.2, 3.3_

  - [x] 3.3 Group C: Recipe matching by category (nitro-app)
    - `server/lib/recipe-matching.ts`: add optional `category?: string | null` to `PantryProductRef`; export `PROCESSED_CATEGORIES` (`Beverages`, `Snacks`, `Instant Noodles`, `Canned Goods`, `Condiments & Sauces`), `isProcessedCategory`, `isRecipeMatchableName` and `keywordSourceNames(items)`
    - In `matchIngredientsToPantryForDeduction`, branch on `isProcessedCategory(item.category)`: non-processed (including `null`, `Uncategorized`, `Dairy`, `Grains`) keeps the existing predicate unchanged; `Beverages`/`Snacks`/`Instant Noodles` match only on whole-product equality (cleaned name or stem); **`Condiments & Sauces` and `Canned Goods` use whole-product equality OR the ingredient equals the head phrase (trailing words, stemmed) with no flavor marker (`flavor`, `flavour`, `flavored`, `flavoured`, `scented`, case-insensitive)** - this is the default, not literal exclusion
    - Do not infer category from the name for `null` categories (substring-based `inferCategory` would block real ingredients such as "steak")
    - `findMatchingIngredientLine(productName, ingredients, category?)` with the same gating; `pantry_item/[id].get.ts` passes `item.category`
    - Callers select `category` and pass it through: `recipes/suggest.get.ts` (also uses `keywordSourceNames`), `recipes/liked.get.ts`, `recipes/made.get.ts`, `recipes/make.post.ts`, `pantry_item/index.post.ts` notification block (uses `resolvedCategory` and `keywordSourceNames`)
    - Keep `extractPantryKeywords` signature unchanged
    - Add `server/lib/recipe-matching.test.ts`: category gating, head-phrase rule, flavor markers ("Kikkoman Soy Sauce" and "Century Tuna" match; "Sprite Lemon", "Lemon Flavored Chips", "Lemon Sauce" do not), plural/stem cases, `findMatchingIngredientLine` with and without category, `keywordSourceNames`
    - _Bug_Condition: isBugCondition(X) where X.pantryItem.category IN PROCESSED_CATEGORIES AND matchesByPartialName AND NOT isWholeProductMatch_
    - _Expected_Behavior: expectedBehavior(result) - processed items only match as whole products (or allowed head phrase); never as flavor or partial-name ingredient_
    - _Preservation: raw and cooking ingredients, Dairy, Grains, Uncategorized and null categories match exactly as before_
    - _Requirements: 1.6, 2.6, 3.5_

  - [x] 3.4 Group D: Loading skeletons (omniscan-ui)
    - `src/components/SkeletonCard.vue`: extend `variant` with `'hero' | 'recipe' | 'profile'` (existing `pantry | stat | row` render identically); add `role="status"`, `aria-busy="true"`, `aria-live="polite"` and visually hidden "Loading" text; disable shimmer under `prefers-reduced-motion`; dark styles use `html.ion-palette-dark .skeleton-card` / `.shimmer` (no `:global`)
    - `PantryItemDetail.vue`: replace the `isLoading` spinner with a `hero` skeleton; keep error and `item` branches; silent refetch stays silent
    - `ProfilePage.vue`: replace the spinner with a `profile` skeleton inside the same container; error branch unchanged; keep `ion-spinner` import because the save button and username field use it
    - `RecipeSuggestions.vue`: replace the `loading-container` spinner with 4 `recipe` skeletons in the existing `cards-list` grid; tab switches show them again
    - Remove an `ion-spinner` import only if nothing else on that page uses it
    - Verify with `vue-tsc --noEmit`
    - _Bug_Condition: isBugCondition(X) where X.page IN {PantryItemDetail, Profile, Recipes} AND X.isLoading AND spinner only_
    - _Expected_Behavior: expectedBehavior(result) - layout-matched SkeletonCard placeholders, replaced by unchanged content, error or empty state_
    - _Preservation: loaded, error and empty states; silent refetch; PantryPage skeleton usage_
    - _Requirements: 1.3, 1.4, 1.5, 2.3, 2.4, 2.5, 3.4_

  - [x] 3.5 Group E: Auth pages dark palette (omniscan-ui)
    - Add scoped `html.ion-palette-dark .x` blocks (never `:global(html.ion-palette-dark)`) to `ForgotPasswordPage.vue`, `ResetPasswordPage.vue`, `VerifyEmailPage.vue`, `CheckEmailPage.vue`, copying the Login pattern: `.auth-content` `--background: #0b160b`, `.auth-card` `#0b160b`, `.auth-title` `#f9fafb`, `.auth-subtitle` `#9ca3af`, `.input-label` `#d1d5db`, `.back-button` `#f9fafb`, `.switch-auth` `#9ca3af`
    - Inputs (Forgot, Reset, Verify resend): `.custom-input` background `#172617`, border `#2d4a2d`, text `#f9fafb`, placeholder `#6b7280`, focus `#05c450`, autofill shadow `#172617`, all `!important`; `.password-toggle` on Reset
    - Grep each file's `<style scoped>` for hard-coded light backgrounds (feedback banners, `.form-error`/`.form-success`, icon wraps, `.email-highlight`) and add a dark variant for each
    - Leave `.auth-brand-panel` gradient and `.submit-button` unchanged; do not edit Login, Register, `dark-mode.css` or `WelcomePage.vue`
    - Verify with `vue-tsc --noEmit`; note autofill and palette visual checks for the user
    - _Bug_Condition: isBugCondition(X) where X.page IN {ForgotPassword, ResetPassword, VerifyEmail, CheckEmail} AND X.darkMode AND X.cardPalette = Navy_
    - _Expected_Behavior: expectedBehavior(result) - page #0b160b, surface #172617, border #2d4a2d, text #f9fafb_
    - _Preservation: light mode styling, brand panel in both modes, navy theme elsewhere, Login/Register, dark-mode.css_
    - _Requirements: 1.7, 2.7, 3.6, 3.7_

  - [x] 3.6 Group F: Scan page and Scan Result modal contrast (omniscan-ui)
    - `ScanPage.vue` (scoped, `html.ion-palette-dark .x`): `.back-prompt-text { color: #cbd5e1 }`, `.back-prompt-text strong { color: #f1f5f9 }`, `.skip-btn { --color: #7dd3fc }`
    - `ScanResultModal.vue`: `.alt-row__name { color: #f1f5f9 }`, `.alt-row__descriptor { color: #cbd5e1 }`, `.alt-row { border-bottom-color: #334155 }`, dark-friendly `.alt-tag-chip` only if a check shows it fails
    - `ScanResultModal.vue` Category select: `html.ion-palette-dark .category-select { background-color: #1e293b !important; color: #f1f5f9 !important; -webkit-text-fill-color: #f1f5f9; border-color: #334155 !important; color-scheme: dark; }` plus `.category-select option { background-color: #1e293b; color: #f1f5f9 }`
    - Labels: add class `field-label--strong` (additive) to the Category and Storage Location `<label>` elements and `html.ion-palette-dark .field-label.field-label--strong { color: #e2e8f0 !important }`; Net Content and Quantity labels, inputs and unit select untouched
    - Confirm contrast of chosen colors is at least 4.5:1 with a small computed-contrast assertion in the source-check test
    - Verify with `vue-tsc --noEmit`; flag the amber label contrast and the open dropdown as manual visual checks for the user
    - _Bug_Condition: isBugCondition(X) where X.darkMode AND X.element IN {back-prompt-text strong, skip-btn, alt-row__name, alt-row__descriptor, category-select, category-label, storage-location-label} AND contrastRatio < 4.5_
    - _Expected_Behavior: expectedBehavior(result) - contrastRatio >= 4.5; Category select dark background with light text_
    - _Preservation: light mode appearance, Net Content / Quantity / Unit controls in dark mode, dark-mode.css_
    - _Requirements: 1.8, 1.9, 1.10, 2.8, 2.9, 2.10, 3.8_

  - [x] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Heavy Payloads, Processed-Item Matching, Missing Dark Rules and Skeletons
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - Run via `cmd /c "npx.cmd vitest run > out.txt 2>&1"` and read the file
    - **EXPECTED OUTCOME**: Test PASSES (confirms bugs are fixed)
    - Note: handler tests that depend on the new column must work with mocked `prisma`; they do not require the migration to have been applied
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Raw Ingredient Matching, Response Shapes, Light Mode and Existing Suites
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run via `cmd /c "npx.cmd vitest run > out.txt 2>&1"` and read the file
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm the original 9 files / 75 tests still pass
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run the full nitro-app vitest suite (`cmd /c "npx.cmd vitest run > out.txt 2>&1"`) and read the output
  - Run `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit` in `omniscan-ui` (must be clean)
  - Run `node ../omniscan-ui/node_modules/typescript/bin/tsc --noEmit -p .` in `nitro-app` (only the roughly 20 pre-existing unrelated errors, plus `image_thumb_base64` errors that disappear after the user regenerates the client)
  - Remove temporary files (`out.txt`, timing logs)
  - Remind the user of the manual steps, in order: `node node_modules/prisma/build/index.js migrate deploy` from `nitro-app`, `prisma generate`, deploy the server, run `prisma/backfill-product-thumbs.ts`, deploy the UI; then do the visual pass in light and dark mode
  - Ensure all tests pass, ask the user if questions arise.
