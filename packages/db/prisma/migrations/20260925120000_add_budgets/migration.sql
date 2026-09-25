-- CreateTable
CREATE TABLE "Budget" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Budget_tenantId_categoryId_periodStart_key"
    ON "Budget"("tenantId", "categoryId", "periodStart");

CREATE INDEX "Budget_tenantId_periodStart_idx"
    ON "Budget"("tenantId", "periodStart");

-- AddForeignKey
ALTER TABLE "Budget"
    ADD CONSTRAINT "Budget_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Budget"
    ADD CONSTRAINT "Budget_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
