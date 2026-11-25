-- CreateTable: ProductCategory
-- Stores the admin-managed list of pantry/product categories.
-- is_locked = true for 'Uncategorized' (the system default — cannot be renamed or deleted).

CREATE TABLE "ProductCategory" (
    "id"         SERIAL       NOT NULL,
    "name"       TEXT         NOT NULL,
    "is_locked"  BOOLEAN      NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- Seed: insert the eight canonical categories that were previously hardcoded in
-- server/lib/pantry-taxonomy.ts. 'Uncategorized' is marked locked.
INSERT INTO "ProductCategory" ("name", "is_locked") VALUES
    ('Canned Goods',        false),
    ('Instant Noodles',     false),
    ('Condiments & Sauces', false),
    ('Dairy',               false),
    ('Snacks',              false),
    ('Beverages',           false),
    ('Grains',              false),
    ('Uncategorized',       true);
