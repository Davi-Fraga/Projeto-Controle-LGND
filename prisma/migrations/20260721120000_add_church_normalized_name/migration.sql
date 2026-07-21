-- AlterTable: coluna do nome canônico normalizado (busca acento/caixa-insensível).
-- Adicionada primeiro como nullable para permitir o backfill dos registros
-- existentes antes de impor NOT NULL.
ALTER TABLE "Church" ADD COLUMN "normalizedName" TEXT;

-- Backfill: normalizedName = normalize(name)
--   - sem acento (translate dos caracteres PT-BR mais comuns)
--   - minúsculo
--   - espaços colapsados e aparados
-- Espelha `normalizeName` de @central-da-manada/shared, usado na escrita e na query.
UPDATE "Church"
SET "normalizedName" = lower(translate(
  trim(regexp_replace(coalesce("name", ''), '\s+', ' ', 'g')),
  'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿ',
  'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYyy'
));

-- Impõe a obrigatoriedade só depois de todos os registros terem valor.
ALTER TABLE "Church" ALTER COLUMN "normalizedName" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Church_normalizedName_idx" ON "Church"("normalizedName");
