CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX recipe_ingredient_search_trgm_idx ON public."Recipe" USING gin (ingredient_search_text gin_trgm_ops);