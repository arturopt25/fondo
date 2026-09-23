-- CreateEnum
CREATE TYPE "LedgerScope" AS ENUM ('PERSONAL', 'SEPARATE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateTable
CREATE TABLE "Ledger" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "scope" "LedgerScope" NOT NULL DEFAULT 'PERSONAL',
    "businessId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "ledgerId" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "categoryId" UUID,
    "accountId" UUID,
    "transferFromId" UUID,
    "transferToId" UUID,
    "serviceKey" "ServiceKey",
    "sourceType" VARCHAR(32),
    "sourceId" UUID,
    "note" VARCHAR(500),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ledger_tenantId_businessId_key" ON "Ledger"("tenantId", "businessId");

-- CreateIndex
CREATE INDEX "Ledger_tenantId_idx" ON "Ledger"("tenantId");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_occurredAt_idx" ON "Transaction"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_ledgerId_occurredAt_idx" ON "Transaction"("ledgerId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_serviceKey_idx" ON "Transaction"("serviceKey");

-- AlterTable: attach accounts to a ledger.
ALTER TABLE "FinancialAccount" ADD COLUMN "ledgerId" UUID;

-- Backfill one PERSONAL ledger per tenant and assign its accounts.
INSERT INTO "Ledger" ("id", "tenantId", "name", "scope", "businessId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), t."id", 'Personal', 'PERSONAL', NULL, now(), now()
FROM "Tenant" t;

UPDATE "FinancialAccount" fa
SET "ledgerId" = l."id"
FROM "Ledger" l
WHERE l."tenantId" = fa."tenantId" AND l."scope" = 'PERSONAL';

ALTER TABLE "FinancialAccount" ALTER COLUMN "ledgerId" SET NOT NULL;

DROP INDEX "FinancialAccount_tenantId_name_key";
CREATE UNIQUE INDEX "FinancialAccount_ledgerId_name_key" ON "FinancialAccount"("ledgerId", "name");

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;