-- CreateTable
CREATE TABLE "ChurchAlias" (
    "id" UUID NOT NULL,
    "churchId" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'curation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurchAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChurchAlias_normalizedAlias_key" ON "ChurchAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "ChurchAlias_churchId_idx" ON "ChurchAlias"("churchId");

-- AddForeignKey
ALTER TABLE "ChurchAlias" ADD CONSTRAINT "ChurchAlias_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
