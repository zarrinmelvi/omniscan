# Epic 6 — Product Deduplication + Storage Quotas

## Part 1: Product deduplication (catalog-backed, Option A)

Each user keeps their own Product row (and their own `image_base64`), but
duplicate scans/manual-adds of the same real-world product LINK to the earliest
(canonical) Product row for shared metadata.

Schema changes (additive, nullable — safe against existing rows):

- `Product.canonical_key String?` — normalized `"brand|product_name"` key.
- `Product.canonical_product_id Int?` — self-link to the canonical Product.
- `Product.canonical_product` / `Product.duplicates` — the `ProductCanonical`
  self-relation.
- `@@index([canonical_key])`.

### Migration

```bash
npx prisma migrate dev --name epic6_product_dedup_and_quota
```

All new fields are additive and nullable, so the migration is safe against
existing rows — no data loss, no required backfill.

### Optional backfill

Populate `canonical_key` for existing products so future scans can dedupe
against them:

```sql
-- Backfill canonical_key for existing products (brand|product_name normalized)
UPDATE "Product"
SET canonical_key = lower(regexp_replace(brand_name, '[^a-zA-Z0-9]+', ' ', 'g')) || '|' ||
                    lower(regexp_replace(product_name, '[^a-zA-Z0-9]+', ' ', 'g'))
WHERE canonical_key IS NULL;
```

Note: this leaves `canonical_product_id` NULL for all existing rows — each stays
canonical, and only NEW scans/manual-adds link to them. That is intentional and
safe.

### How it works

- `server/lib/product-dedup.ts`
  - `buildCanonicalKey(brand, productName)` — lowercase, strip diacritics,
    collapse non-alphanumerics to single spaces, join as `"brand|product"`.
  - `findCanonicalProduct(brand, productName)` — earliest non-deleted canonical
    row with a matching key (skips keys with an empty/too-short product name).
- Wired into `server/api/scan/index.post.ts` and
  `server/api/pantry_item/index.post.ts`: the new row stores `canonical_key`,
  links via `canonical_product_id` when a match exists, and inherits the
  canonical ingredient text when the fresh read is empty. The user's own image
  is always kept (never inherited).
- The scan response `scan.product` now includes `canonical_product_id` and
  `is_duplicate`.

## Part 2: Storage quota — 100 active pantry items

- `MAX_ACTIVE_PANTRY_ITEMS = 100` in `server/lib/quota.ts`.
- "Active" = `is_archived = false AND deleted_at = null`.
- Enforced in `server/api/pantry_item/index.post.ts` via
  `assertPantryQuotaAvailable(userId)`, called at the very start of the handler
  (before the existing 7/day manual-upload limit, which is unchanged).
- On exceed, returns HTTP 429 with
  `data: { quota_exceeded: true, limit, active }`.
- `server/api/upload_limit/index.get.ts` now also returns
  `active_pantry_items`, `pantry_item_limit`, and `pantry_quota_remaining` for
  the UI.
- Frontend: `ScanResultModal.vue` and `PhotoPantryUploadModal.vue` detect the
  429 + `quota_exceeded` on the pantry POST and show a "Storage Limit Reached"
  alert instead of a generic error.
