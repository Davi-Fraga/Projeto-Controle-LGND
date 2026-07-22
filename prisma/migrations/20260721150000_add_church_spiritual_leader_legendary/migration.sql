-- Vínculo opcional entre a identidade do líder espiritual e um Legendário.
-- O texto livre e o usuário de acesso permanecem independentes.
ALTER TABLE "Church"
  ADD COLUMN IF NOT EXISTS "spiritualLeaderLegendaryId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Church_spiritualLeaderLegendaryId_fkey'
  ) THEN
    ALTER TABLE "Church"
      ADD CONSTRAINT "Church_spiritualLeaderLegendaryId_fkey"
      FOREIGN KEY ("spiritualLeaderLegendaryId")
      REFERENCES "Legendary"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Church_spiritualLeaderLegendaryId_idx"
  ON "Church"("spiritualLeaderLegendaryId");
