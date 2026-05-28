CREATE TABLE "Church" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "city" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Church_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Profession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Profession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Expertise" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Expertise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegendaryExpertise" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "legendaryId" UUID NOT NULL,
  "expertiseId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegendaryExpertise_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Legendary" ADD COLUMN "isFromRotaDoCerrado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Legendary" ADD COLUMN "churchId" UUID;
ALTER TABLE "Legendary" ADD COLUMN "servesInChurch" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Legendary" ADD COLUMN "churchRole" TEXT;
ALTER TABLE "Legendary" ADD COLUMN "professionId" UUID;
ALTER TABLE "Legendary" ADD COLUMN "socialActionInterest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Legendary" ADD COLUMN "notes" TEXT;

CREATE INDEX "Church_name_idx" ON "Church"("name");
CREATE INDEX "Church_city_idx" ON "Church"("city");
CREATE UNIQUE INDEX "Profession_name_key" ON "Profession"("name");
CREATE INDEX "Profession_name_idx" ON "Profession"("name");
CREATE UNIQUE INDEX "Expertise_name_key" ON "Expertise"("name");
CREATE INDEX "Expertise_name_idx" ON "Expertise"("name");
CREATE INDEX "Legendary_lgndNumber_idx" ON "Legendary"("lgndNumber");
CREATE INDEX "Legendary_phone_idx" ON "Legendary"("phone");
CREATE INDEX "Legendary_churchId_idx" ON "Legendary"("churchId");
CREATE INDEX "Legendary_professionId_idx" ON "Legendary"("professionId");
CREATE INDEX "Legendary_socialActionInterest_idx" ON "Legendary"("socialActionInterest");
CREATE UNIQUE INDEX "LegendaryExpertise_legendaryId_expertiseId_key" ON "LegendaryExpertise"("legendaryId", "expertiseId");
CREATE INDEX "LegendaryExpertise_legendaryId_idx" ON "LegendaryExpertise"("legendaryId");
CREATE INDEX "LegendaryExpertise_expertiseId_idx" ON "LegendaryExpertise"("expertiseId");

ALTER TABLE "Legendary" ADD CONSTRAINT "Legendary_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Legendary" ADD CONSTRAINT "Legendary_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegendaryExpertise" ADD CONSTRAINT "LegendaryExpertise_legendaryId_fkey" FOREIGN KEY ("legendaryId") REFERENCES "Legendary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegendaryExpertise" ADD CONSTRAINT "LegendaryExpertise_expertiseId_fkey" FOREIGN KEY ("expertiseId") REFERENCES "Expertise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
