-- CreateTable
CREATE TABLE "RecipeInteraction" (
    "id" SERIAL NOT NULL,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "made_at" TIMESTAMP(3),
    "user_id" INTEGER NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "RecipeInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecipeInteraction_user_id_recipe_id_key" ON "RecipeInteraction"("user_id", "recipe_id");

-- AddForeignKey
ALTER TABLE "RecipeInteraction" ADD CONSTRAINT "RecipeInteraction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeInteraction" ADD CONSTRAINT "RecipeInteraction_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
