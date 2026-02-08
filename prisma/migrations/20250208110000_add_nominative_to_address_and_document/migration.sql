-- AlterTable EntityAddress: add nominative (azienda o persona terza)
ALTER TABLE "EntityAddress" ADD COLUMN "nominative" TEXT;

-- AlterTable Document: add shippingNominative to snapshot
ALTER TABLE "Document" ADD COLUMN "shippingNominative" TEXT;
