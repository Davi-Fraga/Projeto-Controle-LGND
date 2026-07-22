-- AlterTable: texto normalizado de busca (nome + cidade).
ALTER TABLE "Church" ADD COLUMN "searchText" TEXT;

-- Backfill: searchText = normalize(name + city).
-- Espelha `normalizeName` de @central-da-manada/shared e a migration de
-- `normalizedName`: minúsculas, espaços colapsados e diacríticos removidos.
UPDATE "Church"
SET "searchText" = lower(translate(
  trim(regexp_replace(concat_ws(' ', "name", "city"), '\s+', ' ', 'g')),
  'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿ',
  'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYyy'
));

-- CreateIndex
CREATE INDEX "Church_searchText_idx" ON "Church"("searchText");
