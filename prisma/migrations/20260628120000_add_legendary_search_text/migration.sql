-- AlterTable: coluna de busca normalizada
ALTER TABLE "Legendary" ADD COLUMN "searchText" TEXT;

-- Backfill: searchText = normalize(fullName + city + lgndNumber)
--   - sem acento (translate dos caracteres PT-BR mais comuns)
--   - minúsculo
--   - espaços colapsados e aparados
-- Espelha o `normalizeSearch` do LegendariosService usado na escrita e na query.
UPDATE "Legendary"
SET "searchText" = lower(translate(
  trim(regexp_replace(
    coalesce("fullName", '') || ' ' || coalesce("city", '') || ' ' || coalesce("lgndNumber", ''),
    '\s+', ' ', 'g'
  )),
  'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿ',
  'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYyy'
));
