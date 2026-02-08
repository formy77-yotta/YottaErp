-- CreateTable ProductAnnualStat: statistiche annuali per prodotto (vendite, acquisti, CMP)
CREATE TABLE "ProductAnnualStat" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "purchasedQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "purchasedTotalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "soldQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "soldTotalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "weightedAverageCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "lastCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAnnualStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductAnnualStat_organizationId_productId_year_key" ON "ProductAnnualStat"("organizationId", "productId", "year");

-- CreateIndex
CREATE INDEX "ProductAnnualStat_organizationId_idx" ON "ProductAnnualStat"("organizationId");

-- CreateIndex
CREATE INDEX "ProductAnnualStat_productId_idx" ON "ProductAnnualStat"("productId");

-- CreateIndex
CREATE INDEX "ProductAnnualStat_organizationId_year_idx" ON "ProductAnnualStat"("organizationId", "year");

-- AddForeignKey
ALTER TABLE "ProductAnnualStat" ADD CONSTRAINT "ProductAnnualStat_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnnualStat" ADD CONSTRAINT "ProductAnnualStat_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
