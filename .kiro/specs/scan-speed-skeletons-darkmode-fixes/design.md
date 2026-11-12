# Scan Speed, Skeletons, Recipe Matching and Dark Mode Bugfix Design

## Overview

This design covers five defect groups from `bugfix.md`. Unlike the requirements phase, every decision below is based on code that was read. The findings that shape the design are:

1. **Heavy payloads are real.** `GET /api/pantry_item` selects `product.image_base64` for every item and has no pagination in practice (the UI never sends `page`/`limit`). `POST /api/scan` echoes both full-size images (`image_base64`, `image_base64_back`) back to the client, and `prisma.product.create` returns them from Postgres a second time. `POST /api/pantry_item` also returns the full image in `include.product`. `PUT /api/pantry_item/:id` returns no image at all, so `PantryPage` replaces the list entry with an image-less product after archive/restore (an existing bug that the list change must not make worse).
2. **Only spinners exist today.** Pantry Item Detail, Profile and Recipes all use `v-if="isLoading"` with an `ion-spinner`. `SkeletonCard.vue` exists (variants `pantry | stat | row`, correct dark rules) and is used only by `PantryPage`.
3. **The recipe matcher has no category input at all.** `recipe-matching.ts` matches on `product_name` only, using word-boundary regex on the cleaned name. A product called "Lemon Iced Tea" therefore matches the ingredient "lemon". `Product` has no `food_category`; the AI value from the scan is only echoed to the UI and ends up in `PantryItem.category` (nullable, one of 8 values including `Uncategorized`). The matcher is used by `suggest.get.ts`, `liked.get.ts`, `made.get.ts`, `make.post.ts` (deduction), `pantry_item/index.post.ts` (notification) and, through `findMatchingIngredientLine`, `pantry_item/[id].get.ts`.
4. **Auth palettes differ because of CSS specificity, not missing pages.** `dark-mode.css` styles `.auth-content`, `.auth-card`, `.custom-input` with the navy tokens. `LoginPage.vue` and `RegisterPage.vue` win with scoped `html.ion-palette-dark .x` rules (extra `[data-v]` attribute gives higher specificity). `ForgotPasswordPage`, `ResetPasswordPage`, `VerifyEmailPage` and `CheckEmailPage` have no dark rules, so they fall through to navy.
5. **The Scan unreadable text has exact causes.** `.back-prompt-text strong` is hard-coded `#0f172a` and every status message is wrapped in `<strong>`. `.skip-btn` sets `--color: #0284c7`. `.alt-row__name` is `#1f2937`. `.category-select` has no dark rule at all (the sibling inputs get theirs from `dark-mode.css`, which lists `.quantity-input`, `.pieces-input`, `.unit-select` but not `.category-select`) and is forced `background-color: #fff !important; color-scheme: light`.

Fix strategy, in short: send thumbnails instead of full images (new `Product.image_thumb_base64` column, additive and nullable), remove avoidable sequential work in scan without touching the 9bef136 behavior, add layout-matched skeletons through new `SkeletonCard` variants, gate recipe matching by pantry category inside the shared matcher, and add scoped `html.ion-palette-dark` rules to the auth pages and the two Scan components. `dark-mode.css` is not touched and nothing is renamed.

## Glossary

- **Bug_Condition (C)**: Any interaction in the five defect groups of `bugfix.md` (see Bug Details).
- **Property (P)**: The desired behavior for those interactions (see Correctness Properties).
- **Preservation**: Behavior for all inputs outside C that must stay identical (see Expected Behavior).
- **Thumbnail**: A JPEG data URI, long edge 320px, quality about 70, stored in `Product.image_thumb_base64`. Typically 10 to 30 KB versus several hundred KB to MB for the full image.
- **Processed category**: `Beverages`, `Snacks`, `Instant Noodles`, `Canned Goods`, `Condiments & Sauces`. Defined once in the matcher.
- **Plain-ingredient candidate**: A pantry item that is allowed to match recipe ingredients (category `Dairy`, `Grains`, `Uncategorized`, `null`, or any item that passes the processed-item rules below).
- **Head phrase**: The trailing words of a cleaned product name (for example "soy sauce" in "kikkoman soy sauce").
- **`matchIngredientsToPantryForDeduction`** in `nitro-app/server/lib/recipe-matching.ts`: the core matcher. `matchIngredientsToPantry` is built on it.
- **`findMatchingIngredientLine`** in the same file: the "recipes using this item" matcher used by the pantry item detail endpoint.
- **`PantryItem.category`**: User-visible, user-editable category string (`PANTRY_CATEGORIES` in `pantry-taxonomy.ts`). This is the only persisted "food category" on a pantry item.
- **9bef136 behavior**: Skip the allergen AI call for plain-text-matched allergens, 8s semantic allergen timeout, alternatives started early and awaited just before the response, audit + activity log written together, client `resizeImageForUpload` (1600px, JPEG 0.85).

## Bug Details

### Bug Condition

The bug manifests in five independent places. All five stem from code paths that were read for this design.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type AppInteraction
  OUTPUT: boolean

  RETURN
     // D1: heavy payloads
     (X.kind = PantryLoad  AND X.response.items ANY product.image_base64 IS full-size image)
  OR (X.kind = ScanResponse AND (X.response.product.image_base64 IS full-size
                              OR X.response.product.image_base64_back IS NOT NULL))
  OR (X.kind = PantryCreate AND X.response.item.product.image_base64 IS full-size)
     // D2: loading without skeleton
  OR (X.page IN {PantryItemDetail, Profile, Recipes}
      AND X.isLoading AND X.showsSpinnerOnly)
     // D3: flavored/processed item matched as plain ingredient
  OR (X.kind IN {RecipeSuggest, RecipeLiked, RecipeMade, RecipeMake, PantryItemRecipeUsage, PantryAddNotification}
      AND X.pantryItem.category IN PROCESSED_CATEGORIES
      AND matchesByPartialName(X.pantryItem.product_name, X.ingredient.name)
      AND NOT isWholeProductMatch(X.pantryItem, X.ingredient))
     // D4: auth palette
  OR (X.page IN {ForgotPassword, ResetPassword, VerifyEmail, CheckEmail}
      AND X.darkMode AND X.cardPalette = Navy)
     // D5: scan contrast
  OR (X.darkMode AND X.element IN {
        ScanPage..back-prompt-text strong, ScanPage..skip-btn,
        ScanResultModal..alt-row__name, ScanResultModal..alt-row__descriptor,
        ScanResultModal..category-select, ScanResultModal..category-label,
        ScanResultModal..storage-location-label}
      AND X.contrastRatio < 4.5)
END FUNCTION
```

`isWholeProductMatch` is defined in Fix Implementation (exact/stem equality for all processed categories, plus head-phrase equality for `Condiments & Sauces` and `Canned Goods`).

### Examples

- **D1 list**: A user with 40 pantry items, each with a 600 KB photo, downloads about 24 MB on every Pantry and Home visit. Expected: about 0.5 to 1 MB of thumbnails. Pantry and Home render the same pictures.
- **D1 scan**: A two-photo scan returns both 1600px images (up to a few MB of JSON; Vercel functions cap response bodies at 4.5 MB). Expected: a small thumbnail only. The UI only draws a 40px thumb from `product.image_base64` and never reads `image_base64_back`.
- **D1 add to pantry**: The `POST /api/pantry_item` response carries the full product image that the client ignores. Expected: thumbnail only.
- **D2**: Opening Recipes shows a lone spinner; switching to Liked/Made shows the spinner again. Expected: card-shaped skeletons.
- **D3**: Pantry has "Lemon Iced Tea" (category `Beverages`). A recipe needing "lemon" shows as matched, and "Make Recipe" deducts quantity from the tea. Expected: "lemon" is missing. A "Fresh Lemon" item (`Uncategorized`) still matches.
- **D3 edge, kept matching**: "Kikkoman Soy Sauce" (`Condiments & Sauces`) must still satisfy the ingredient "soy sauce". "Century Tuna" (`Canned Goods`) must still satisfy "tuna".
- **D3 edge, newly rejected**: "Sprite Lemon" (`Beverages`, name ends in "lemon"), "Lemon Flavored Chips" (`Snacks`), "Lemon Sauce" (`Condiments & Sauces`, head phrase is "sauce").
- **D4**: Login at `#0b160b` / `#172617`; Forgot Password at `#0f172a` / `#1e293b`.
- **D5**: "First photo captured." renders `#0f172a` on a `#1e293b` card; alternative names render `#1f2937` on the dark sheet; the Category select is a white box with `#3b5bfd` text.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Everything listed in 9bef136 (see Glossary) stays as-is, including the 8s semantic allergen timeout and the early-started alternatives task.
- Scan results (product, ingredients, allergens, halal status and certifiers, alternatives, `matched_user_allergens`, `food_category`, `*_detected` fields, `scan_time`, `safety_verdict`, `flag_reason`) are identical. FlaggedScan, audit and notification rules are unchanged.
- Response field **names** are kept. `product.image_base64` stays in the scan response and in the pantry list/POST/PUT responses, now carrying a thumbnail data URI. `product.image_base64_back` stays in the scan response, now `null` (the UI never displays it; `ScanPage.vue` already does `?? null`).
- `GET /api/pantry_item/:id` still returns the full-size `image_base64`. Admin endpoints and `VerificationPanel` are untouched.
- The pantry list keeps its `pagination` block and `page`/`limit` support. We do not make pagination mandatory because the UI filters, sorts and counts locally.
- Raw or cooking ingredients (fresh lemon, rice, eggs, flour, vegetables, dairy, grains, `Uncategorized`, legacy `null` category) match exactly as before, including plural/stem and word-boundary rules.
- Error, empty and loaded states of Pantry Item Detail, Profile and Recipes. The silent refetch in `fetchItem(true)` (no loading indicator) stays silent.
- Light mode on every page; the green gradient brand panel in both modes; the navy theme everywhere else; `dark-mode.css` byte-for-byte; Net Content, Quantity and Unit controls in dark mode.
- Existing tests: nitro-app vitest suite (9 files / 75 tests) and omniscan-ui `vue-tsc` clean. No renames of functions, routes or fields.

**Scope:**
All inputs that do NOT involve a list/scan/create/update payload carrying a full image, a loading state on the three pages, a processed-category partial-name match, an auth page in dark mode (the four listed), or the listed Scan elements in dark mode are unaffected.

## Hypothesized Root Cause

Each cause below is confirmed by reading the code unless marked otherwise.

1. **D1 Payload (confirmed)**
   - `pantry_item/index.get.ts` selects `product.image_base64` for all items.
   - `scan/index.post.ts` returns `product.image_base64` and `image_base64_back` and uses `prisma.product.create` without `select`, so the full strings round-trip from Postgres.
   - `pantry_item/index.post.ts` includes `product.image_base64` in its response.
   - `PantryPage` and `HomePage` both call `/api/pantry_item` on every `onIonViewWillEnter`/mount with no cache and no in-flight dedupe, and there is no pantry store (only `authStore` and `adminAuthStore`). After "Add to Pantry" the next Pantry visit re-downloads everything and shows skeletons.
   - Avoidable sequential scan work (confirmed in code): `findCanonicalProduct` runs after the big `Promise.all` although it only needs brand/name; `productHalalLogo.createMany` and `scan.create` run one after the other; `FlaggedScan` create and the `FLAG` audit event run one after the other. These are small compared to the AI call and the image payloads, so they are included but not expected to dominate.
   - Not confirmed: how much time `catalogProduct.findMany` (all verified products, every scan) costs. It is measured first (see Testing Strategy) and left alone unless it shows up.

2. **D2 Loading UI (confirmed)**: `isLoading` branches render `ion-spinner`. `SkeletonCard` has no variant for a hero+tabs layout, a profile header, or a recipe card.

3. **D3 Matching (confirmed)**
   - The matcher only sees `{ id, product_name }`; callers do not select `category`.
   - `rawRegex.test(cleanedProduct)` lets any ingredient word that appears anywhere in a product name match.
   - `extractPantryKeywords` (used for the SQL candidate pre-filter in `suggest.get.ts` and `pantry_item/index.post.ts`) also feeds flavor words like "lemon" into candidate retrieval.
   - Risk found while reading `inferCategory`: it uses plain substring checks (for example `'tea'` matches "steak"). So legacy `null` categories must NOT be inferred at match time or real ingredients would be blocked. `null` is treated as plain.

4. **D4 Auth (confirmed)**: global `dark-mode.css` rules match `.auth-*`/`.custom-input` on all pages; only Login/Register override them with higher-specificity scoped rules.

5. **D5 Contrast (confirmed)**: see selectors in the Overview. A note on labels: `dark-mode.css` already sets `.field-label` to amber `#f59e0b !important`, so the Category and Storage Location labels are presumably amber today, not dark. The requirement asks for a "readable light color"; I could not render the app, so the contrast of the amber labels is unverified. The design implements the requirement as written (light color) for those two labels only and flags it for visual confirmation.

## Correctness Properties

Property 1: Bug Condition - Lightweight image payloads

_For any_ call to `GET /api/pantry_item`, `POST /api/scan`, `POST /api/pantry_item` or `PUT /api/pantry_item/:id` where the bug condition holds (the response would carry a full-size product image), the fixed endpoint SHALL return `product.image_base64` as a thumbnail data URI (long edge at most 320px) or `null`, SHALL return `product.image_base64_back` as `null` from the scan endpoint, SHALL keep every other response field and value unchanged, and the item's picture SHALL still render in Pantry, Home, the Scan Result modal and (full size, from `GET /api/pantry_item/:id`) the detail page.

**Validates: Requirements 2.1, 2.2, 3.1, 3.2, 3.3**

Property 2: Bug Condition - Skeleton placeholders while loading

_For any_ render of Pantry Item Detail, Profile or Recipes where `isLoading` is true (first load, retry, or Recipes tab switch), the fixed page SHALL render skeleton placeholders built from `SkeletonCard` that match the page layout (and expose a polite loading status to assistive technology), and SHALL replace them with the unchanged real content, error state or empty state when loading ends.

**Validates: Requirements 2.3, 2.4, 2.5, 3.4**

Property 3: Bug Condition - Processed items are not plain ingredients

_For any_ pantry item whose `category` is in `{Beverages, Snacks, Instant Noodles, Canned Goods, Condiments & Sauces}` and any recipe ingredient, the fixed matcher SHALL report a match only if the item is a whole-product match for the ingredient (cleaned name equals the ingredient or its stem; for `Condiments & Sauces` and `Canned Goods` additionally the ingredient equals the head phrase of the product name and the name carries no flavor marker), and SHALL NOT match, suggest, deduct or credit it as the flavor or partial-name ingredient, in suggestions, liked/made lists, the recipe maker, pantry-add notifications and "recipes using this item".

**Validates: Requirements 2.6**

Property 4: Bug Condition - Consistent auth palette and readable Scan text in dark mode

_For any_ dark-mode render of Login, Register, Forgot Password, Reset Password, Verify Email or Check Email, the fixed page SHALL use page `#0b160b`, surface `#172617`, border `#2d4a2d`, text `#f9fafb` (updated at user request to the app's navy tokens: `#0f172a` / `#1e293b` / `#334155` / `#f1f5f9`); and _for any_ dark-mode render of the listed Scan page and Scan Result modal elements, the fixed styles SHALL give normal text a contrast ratio of at least 4.5:1 against its background, with the Category select using a dark background and light text.

**Validates: Requirements 2.7, 2.8, 2.9, 2.10**

Property 5: Preservation - Non-buggy inputs unchanged

_For any_ input where the bug condition does NOT hold (light mode, other pages, scan semantics, raw/cooking ingredients, loaded states, API fields other than the image fields), the fixed code SHALL produce the same result as the original code, preserving the 9bef136 scan behavior, resize behavior, response shapes, the navy theme, `dark-mode.css`, and the existing 75 tests.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

Property 6: Preservation - Raw ingredient matching equivalence

_For any_ pantry item with category `Dairy`, `Grains`, `Uncategorized` or `null` (and any item that passes Property 3's whole-product rule), the fixed matcher SHALL return the same match result as the original matcher for every ingredient.

**Validates: Requirements 3.5**

## Fix Implementation

### Changes Required

#### A. Image payloads (D1) - nitro-app

**Schema**: `prisma/schema.prisma`, model `Product`: add `image_thumb_base64 String?`. Additive, nullable, no default; new migration folder under `prisma/migrations` following the existing naming. No existing column is changed or renamed. The generated client in `server/generated/prisma` must be regenerated (`prisma generate`).

**New file** `server/lib/image-thumb.ts` (uses `sharp`, already a dependency used by `logo-crop.ts`):
- `makeThumbDataUri(input: Buffer | string, maxEdge = 320, quality = 70): Promise<string | null>`. Accepts a Buffer or a data URI, applies `rotate()` (EXIF), resizes with `fit: 'inside'`, `withoutEnlargement: true`, encodes JPEG. Returns `null` on any failure (never throws), mirroring how `cropLogo` is used.

**File** `server/api/scan/index.post.ts`
1. Start `makeThumbDataUri(frontBuffer)` as soon as extraction is known. The front buffer is `imageBackField.data` when `hasBackImage && extraction.front_image_index === 1`, otherwise `imageField.data`. Run it concurrently with the existing `Promise.all` so it adds no wall time.
2. `prisma.product.create`: add `image_thumb_base64: thumb` to `data` (full `image_base64` and `image_base64_back` are still stored exactly as today), and add a `select` that excludes `image_base64` and `image_base64_back` so Postgres does not send them back.
3. Response: `image_base64: thumb`, `image_base64_back: null`. Every other field is unchanged.
4. Parallelize independent work without changing semantics: start `findCanonicalProduct(...)` alongside the first `Promise.all` (it only needs `extraction.brand`/`product_name`, which the catalog fill does not modify); run `productHalalLogo.createMany` together with `scan.create`; run the `FlaggedScan` create together with the `FLAG` audit event. The existing `.catch` on FlaggedScan stays.
5. Do not touch: allergen string-match then semantic call with `SEMANTIC_ALLERGEN_TIMEOUT_MS`, `alternativesTask` start/await points, the `Promise.all([logAuditEvent, logRecentActivity])`, the halal rescan gate, thresholds.

**File** `server/api/pantry_item/index.get.ts`
- Select `product: { id, product_name, brand_name, image_thumb_base64 }` instead of `image_base64`.
- Map to the same response shape: `product: { id, product_name, brand_name, image_base64: image_thumb_base64 ?? null, needs_image }`.
- `needs_image` (new, additive): true for products with a full image but no thumbnail yet (legacy rows). Computed by one extra id-only query: `product.findMany({ where: { id: { in }, image_thumb_base64: null, image_base64: { not: null } }, select: { id: true } })`. Prisma compiles this to `IS NULL`/`IS NOT NULL`, so no image data is read.
- Everything else (ordering, serialization, `pagination` block, optional `page`/`limit`) is unchanged.

**File** `server/api/pantry_item/index.post.ts`: `include.product.select` uses `image_thumb_base64` mapped into the response as `image_base64` (the client ignores this response today; `ScanResultModal` and `PhotoPantryUploadModal` both discard it). For the manual-add path, generate `image_thumb_base64` from the uploaded `image_base64` with `makeThumbDataUri` before `product.create`. The notification block and its `matchIngredientsToPantry` call get the category treatment from section C.

**File** `server/api/pantry_item/[id].put.ts`: add `image_thumb_base64` to the product select and return it as `product.image_base64` so Pantry no longer loses the picture after archive/restore. Field set otherwise unchanged.

**New file** `server/api/pantry_item/[id]/image.get.ts` (fallback for legacy rows): auth required, ownership check (same 403/404 rules as `[id].get.ts`), loads the product image, generates and persists the thumbnail if missing, returns `{ success: true, image_base64: <thumb> }`. This is a new route; no existing route changes. File layout note: Nitro already has `[id].get.ts`; adding a folder `[id]/image.get.ts` is compatible with it.

**New script** `prisma/backfill-product-thumbs.ts`, same style as the existing `backfill-*.ts` scripts: batches of products where `image_thumb_base64 IS NULL AND image_base64 IS NOT NULL`, writes thumbnails. Run once after the migration. The fallback endpoint covers anything it misses.

#### B. Image payloads and refetching (D1) - omniscan-ui

**New file** `src/composables/usePantryList.ts` (new, nothing renamed): module-level cache with
- `items`, `isFirstLoad`, `loadError`
- `refresh({ silent })`: dedupes in-flight requests, keeps cached data visible while revalidating
- `invalidate()`: marks the cache stale
- `upsert(item)`: replaces one entry, preserving `product.image_base64` if the incoming product has none

`PantryPage.vue` and `HomePage.vue` read the list through it, so Home and Pantry share one request and a visit with warm cache shows content instantly (skeletons only on a cold first load). `PantryPage.confirmConsume`/`restoreItem` use `upsert`. `ScanResultModal.submitAddToPantry` and `PhotoPantryUploadModal` call `invalidate()` after a successful POST so the next Pantry visit refetches once, and `PantryPage` calls `invalidate()` after DELETE/PUT. `onIonViewWillEnter` keeps calling `refresh({ silent: true })`, so data stays fresh without a blank state.

Lazy fallback: for any card with `product.needs_image === true`, request `/api/pantry_item/:id/image` with `apiFetch` when the card scrolls into view (IntersectionObserver, with a fallback to loading immediately) and store the result in the cache. Authenticated `apiFetch` is required, so this cannot be a plain `<img src>` URL.

TypeScript: add `needs_image?: boolean` to the `Product` interfaces in `PantryPage.vue` and `HomePage.vue` (optional, so existing code type-checks).

`ScanPage.vue`: no change needed for images (already `?? null` for both fields).

#### C. Recipe matching (D3) - nitro-app

**File** `server/lib/recipe-matching.ts` (all additions are optional-parameter, so existing callers and tests keep working):
- `PantryProductRef` gets `category?: string | null`.
- New exported `PROCESSED_CATEGORIES` (`Beverages`, `Snacks`, `Instant Noodles`, `Canned Goods`, `Condiments & Sauces`), `isProcessedCategory(category)`, and `isRecipeMatchableName(...)` helpers.
- In the per-item predicate inside `matchIngredientsToPantryForDeduction`, branch on `isProcessedCategory(item.category)`:
  - Not processed (including `null`, `Uncategorized`, `Dairy`, `Grains`): the existing predicate, unchanged (Property 6).
  - `Beverages`, `Snacks`, `Instant Noodles`: match only on whole-product equality (`cleanedProduct === rawTarget || productStem === targetStem`).
  - `Condiments & Sauces`, `Canned Goods`: whole-product equality, or the ingredient equals the head phrase of the cleaned name (trailing words, stemmed), and the name has no flavor marker (`flavor`, `flavour`, `flavored`, `flavoured`, `scented`, case-insensitive). This keeps "Kikkoman Soy Sauce" for "soy sauce" and "Century Tuna" for "tuna" while rejecting "Lemon Sauce" for "lemon".
- `findMatchingIngredientLine(productName, ingredients, category?)`: same gating with an optional third argument. `pantry_item/[id].get.ts` passes `item.category`.
- `extractPantryKeywords` signature is unchanged. Callers pass only names of items that are not processed, plus the cleaned whole names of processed items that could still match (to keep the SQL pre-filter from pulling in recipes only on flavor words). Concretely, callers build the keyword input with a small helper `keywordSourceNames(items)` exported from the same file.

Callers (select `category` and pass it through; no other behavior change):
- `recipes/suggest.get.ts`: `select` adds `category`; `pantryProducts` includes it; keywords use `keywordSourceNames`.
- `recipes/liked.get.ts`, `recipes/made.get.ts`: same select/pass-through.
- `recipes/make.post.ts`: `select` adds `category`; `pantryProducts` includes it. This is what stops the deduction from touching a lemon drink.
- `pantry_item/index.post.ts` notification block: select `category`, pass it, use `keywordSourceNames`. The new item's category is already known (`resolvedCategory`).
- `pantry_item/[id].get.ts`: pass `item.category` to `findMatchingIngredientLine`.

Decision to confirm: `bugfix.md` 2.6 lists `Condiments & Sauces` and `Canned Goods` as wholly excluded. A literal exclusion would stop "soy sauce", "ketchup", "vinegar", "tuna" and "sardines" from ever satisfying recipes, which looks like a regression against 3.5's intent (real cooking ingredients keep matching). The head-phrase rule is the narrowest change that satisfies both. If you prefer the literal exclusion, remove the head-phrase branch; nothing else changes.

#### D. Skeletons (D2) - omniscan-ui

**File** `src/components/SkeletonCard.vue`: extend the `variant` union with `'hero' | 'recipe' | 'profile'` (existing `pantry | stat | row` render identically). Add an optional `lines` count only if needed by a variant. The component gets `role="status"`, `aria-busy="true"`, `aria-live="polite"` and a visually hidden "Loading" text; the shimmer animation is disabled under `prefers-reduced-motion`. Dark styles follow the file's existing correct pattern: `html.ion-palette-dark .skeleton-card` and `.shimmer` (no `:global`).

- `PantryItemDetail.vue`: replace the `v-if="isLoading"` spinner block with a `hero` skeleton (image block, status banner bar, three tab pills, two info card blocks). Keep `v-else-if="loadError"` and `v-else-if="item"` branches as they are. Silent refetch still skips loading.
- `ProfilePage.vue`: replace the spinner with a `profile` skeleton (avatar circle with name/email lines, preference chip row, three form rows) inside the same container class so spacing matches. Error branch unchanged.
- `RecipeSuggestions.vue`: replace the `loading-container` spinner with `recipe` skeletons (image block + title row + meta line), count 4, using the existing `cards-list` grid so the layout matches 1/2/3 column breakpoints. Tab switches show them again, as the spinner did.

Remove now-unused `ion-spinner` imports only if nothing else on the page uses them (Profile still uses it in the save button and username field).

#### E. Auth dark palette (D4) - omniscan-ui

Add a scoped `html.ion-palette-dark ...` block (the same rules Login uses) to `ForgotPasswordPage.vue`, `ResetPasswordPage.vue`, `VerifyEmailPage.vue` and `CheckEmailPage.vue`, covering the classes each page actually uses:
- Shared: `.auth-content { --background: #0b160b }`, `.auth-card { background: #0b160b }`, `.auth-title { color: #f9fafb }`, `.auth-subtitle { color: #9ca3af }`, `.input-label { color: #d1d5db }`, `.back-button { color: #f9fafb }`, `.switch-auth { color: #9ca3af }`.
- Inputs (Forgot, Reset, Verify resend): `.custom-input` background `#172617`, border `#2d4a2d`, text `#f9fafb`, placeholder `#6b7280`, focus `#05c450`, autofill shadow `#172617` (all `!important`, as in Login, to beat `dark-mode.css`), `.password-toggle` (Reset).
- Page-specific light colors found while reading (feedback banners in Verify/Check, `.form-error`/`.form-success`, verify/email icon wraps, `.email-highlight`) each get a dark variant. During implementation, grep each file's `<style scoped>` for hard-coded light backgrounds and cover every one.
- Brand panel (`.auth-brand-panel` gradient) and `.submit-button` stay as they are.

Rule for all additions: write `html.ion-palette-dark .x`, never `:global(html.ion-palette-dark) .x`. Login and Register already comply and need no edit (verified: they use the `html.ion-palette-dark .x` form). Because the shared values are duplicated per page (matching the existing Login/Register pattern), a later cleanup into one shared stylesheet is possible but out of scope: it would need equal-specificity ordering against `dark-mode.css`, which we cannot edit.

`WelcomePage.vue` is a landing page, not a form page, and is out of scope unless a visual check shows a navy card.

#### F. Scan page and Scan Result modal contrast (D5) - omniscan-ui

All rules go in the component's own `<style scoped>` using `html.ion-palette-dark .x` and `!important` only where an existing `!important` has to be beaten.

`ScanPage.vue`:
- `html.ion-palette-dark .back-prompt-text { color: #cbd5e1; }`
- `html.ion-palette-dark .back-prompt-text strong { color: #f1f5f9; }` (root cause: the `<strong>` rule `#0f172a`)
- `html.ion-palette-dark .skip-btn { --color: #7dd3fc; }`

`ScanResultModal.vue`:
- `html.ion-palette-dark .alt-row__name { color: #f1f5f9; }`
- `html.ion-palette-dark .alt-row__descriptor { color: #cbd5e1; }`
- `html.ion-palette-dark .alt-row { border-bottom-color: #334155; }`
- `html.ion-palette-dark .alt-tag-chip` gets dark-friendly background/text (the green chip on dark sheet is only checked, not changed, unless the visual check fails).
- `html.ion-palette-dark .category-select { background-color: #1e293b !important; color: #f1f5f9 !important; -webkit-text-fill-color: #f1f5f9; border-color: #334155 !important; color-scheme: dark; }` plus `html.ion-palette-dark .category-select option { background-color: #1e293b; color: #f1f5f9; }`. The scoped light rule `background-color: #fff !important; color-scheme: light` has specificity (0,2,0); the new selector with the `[data-v]` attribute is (0,3,1), so it wins.
- Labels: add a new class `field-label--strong` to the Category and Storage Location `<label>` elements (additive; no class is renamed) and `html.ion-palette-dark .field-label.field-label--strong { color: #e2e8f0 !important; }`. This beats `dark-mode.css`'s `html.ion-palette-dark .field-label { color: #f59e0b !important }` on specificity and leaves the Net Content/Quantity labels, inputs and unit select exactly as they are (3.8).
- Chosen colors against the dark surfaces (`#1e293b` or the sheet background): `#f1f5f9` about 13:1, `#cbd5e1` about 9:1, `#7dd3fc` about 9:1, all above 4.5:1. The final values are confirmed with a contrast check during testing.

## Testing Strategy

### Validation Approach

Two phases: first surface counterexamples on the unfixed code, then verify the fix and preservation. nitro-app has vitest; omniscan-ui has only `vue-tsc` and a placeholder test (and a Cypress config), so frontend checks are type-check plus component/DOM style assertions and a manual visual pass. I did not run any tests or change any code in this phase.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples before fixing; confirm or refute the root causes above.

**Test Plan**: Mostly unit tests with mocked `prisma`, following the existing mocking style in `server/tests` and `server/lib/*.test.ts`. Run them on the UNFIXED code first.

**Test Cases**:
1. **List payload size**: mock `prisma.pantryItem.findMany` with items whose product has a 500 KB `image_base64`; assert the response contains no string over 50 KB (will fail on unfixed code).
2. **Scan response**: run the handler with the Ollama call mocked; assert `product.image_base64` is a thumbnail and `image_base64_back` is `null` (will fail on unfixed code).
3. **Lemon drink**: `matchIngredientsToPantry([{name:'lemon'}], [{id:1, product_name:'Lemon Iced Tea', category:'Beverages'}])` expects no match (will fail on unfixed code; today it matches).
4. **Flavor markers**: "Lemon Flavored Chips" (`Snacks`), "Sprite Lemon" (`Beverages`), "Lemon Sauce" (`Condiments & Sauces`) against "lemon" (will fail on unfixed code).
5. **Dark selectors**: assert the compiled CSS of `ScanResultModal`/`ScanPage` contains no dark rule for `.category-select`, `.alt-row__name`, `.back-prompt-text strong`, and that the four auth pages contain no `html.ion-palette-dark` rule (will fail on unfixed code; confirms D4/D5 causes).
6. **Timing baseline** (not a pass/fail test): temporary timing logs around AI call, DB writes, alternatives await and response serialization size for one scan, before and after. This decides whether `catalogProduct.findMany` needs work; if it does not stand out, it is left alone.

**Expected Counterexamples**:
- Full-size strings in list/scan/create responses.
- "lemon" matched to a beverage, snack or sauce.
- No dark rule for the listed selectors; Forgot/Reset/Verify/Check pages fall back to navy.

### Fix Checking

**Goal**: For every input where the bug condition holds, the fixed code gives the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := fixed(X)
  ASSERT expectedBehavior(result)
END FOR

FUNCTION expectedBehavior(result)
  RETURN (result.payload.product.image_base64 IS NULL OR isThumb(result.payload.product.image_base64))
      OR (result.page.loadingState = Skeleton)
      OR (NOT result.matchedAsPlainIngredient)
      OR (result.palette = GreenBlack)
      OR (result.contrastRatio >= 4.5)
END FUNCTION
```

### Preservation Checking

**Goal**: For all inputs where the bug condition does NOT hold, the fixed code matches the original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT original(X) = fixed(X)
END FOR
```

**Testing Approach**: Property-based testing (fast-check, added as a nitro-app devDependency with a pinned version if not already present) for the matcher, because the input space (names, stems, plurals, categories) is large.

**Test Plan**: Capture current matcher outputs on unfixed code, including the real-ingredient cases, then assert equality after the fix.

**Test Cases**:
1. **Raw ingredient equivalence**: for generated pantry names with category in `{Dairy, Grains, Uncategorized, null}`, original and fixed `matchIngredientsToPantry` results are identical.
2. **Whole-name equality kept**: processed-category items whose cleaned name equals the ingredient (for example "Coffee" with `Beverages`, "Soy Sauce" with `Condiments & Sauces`) still match.
3. **Scan semantic preservation**: allergen skip logic, timeout, alternatives and audit calls are invoked as in 9bef136 (assert call patterns with mocks).
4. **Response shape**: key sets of list, scan, POST and PUT responses are equal to before except for the documented image fields and the additive `needs_image`.
5. **Light mode and Net Content**: scoped CSS tests assert no light-mode rule changed and `.quantity-input`, `.pieces-input`, `.unit-select` rules are untouched.

### Unit Tests

- `recipe-matching.test.ts` (new): category gating, head-phrase rule, flavor markers, plural/stem cases, `findMatchingIngredientLine` with and without category, `keywordSourceNames`.
- `image-thumb.test.ts` (new): output is a JPEG data URI, long edge at most 320, never throws on bad input (returns `null`), EXIF rotation applied.
- `pantry_item` list/POST/PUT handler tests: no full-size image in responses, `needs_image` correct, thumbnail persisted for manual add.
- `[id]/image.get.ts`: 401 without auth, 403 for another user's item, 404 for deleted item, generates and persists the thumb.
- Scan handler: thumbnail uses the front image when `front_image_index === 1`; `findCanonicalProduct` runs in parallel and the result is unchanged.
- `SkeletonCard` renders each variant and exposes `role="status"`.

### Property-Based Tests

- Matcher: for any generated product name, category and ingredient name, if the category is processed and the match is partial (ingredient is a strict sub-phrase that is not the head phrase for allowed categories), the result is no match; otherwise the result equals the original matcher (Properties 3 and 6).
- Matcher idempotence and ordering: `matchedIngredients` + `missingIngredients` partition the input ingredients for any category mix.
- Thumbnail: for random image dimensions, the long edge never exceeds 320 and the aspect ratio is kept within rounding.

### Integration Tests

- Scan then Add to Pantry then open Pantry: one list request, thumbnails shown, no skeleton flicker on a warm cache; item image visible on detail page at full size.
- Archive and restore from Pantry: the card keeps its picture.
- Recipes with a pantry containing "Lemon Iced Tea" and "Fresh Lemon": suggestions and "Make Recipe" only use "Fresh Lemon".
- Visual pass in light and dark: Pantry Item Detail, Profile, Recipes skeletons (desktop and mobile widths); Login, Register, Forgot, Reset, Verify, Check Email palettes (including autofill on Forgot/Reset); Scan page status card and skip link; Scan Result alternatives list, Category select (and its open dropdown) and labels. Contrast values are checked with the browser devtools.
- Regression gates: `vitest --run` in `nitro-app` (9 files / 75 tests plus new ones) and `vue-tsc --noEmit` in `omniscan-ui`.

### Rollout Notes

1. Apply the migration and `prisma generate`.
2. Deploy the server (fixed code reads `image_thumb_base64` and tolerates `null`).
3. Run `prisma/backfill-product-thumbs.ts` once. Until then, the lazy `needs_image` path fills thumbnails on demand.
4. Deploy the UI. An old UI against the new server keeps working: `image_base64` is still a data URI or `null`.
