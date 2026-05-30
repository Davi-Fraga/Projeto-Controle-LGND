ALTER TABLE "Church"
  ADD COLUMN "spiritualLeaderName" TEXT,
  ADD COLUMN "spiritualLeaderPhone" TEXT,
  ADD COLUMN "spiritualLeaderUserId" UUID,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION;

CREATE INDEX "Church_spiritualLeaderUserId_idx" ON "Church"("spiritualLeaderUserId");

ALTER TABLE "Church"
  ADD CONSTRAINT "Church_spiritualLeaderUserId_fkey"
  FOREIGN KEY ("spiritualLeaderUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
