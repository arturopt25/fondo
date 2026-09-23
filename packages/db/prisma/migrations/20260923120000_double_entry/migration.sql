-- CreateEnum
CREATE TYPE "EntryDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "TransactionEntry" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "financialAccountId" UUID,
    "categoryId" UUID,
    "direction" "EntryDirection" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionEntry_pkey" PRIMARY KEY ("id")
);

-- AlterTable: idempotency and reversal support.
ALTER TABLE "Transaction" ADD COLUMN "reversesId" UUID,
ADD COLUMN "reversedById" UUID,
ADD COLUMN "idempotencyKey" VARCHAR(128),
ADD COLUMN "idempotencyHash" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_tenantId_idempotencyKey_key" ON "Transaction"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reversesId_key" ON "Transaction"("reversesId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reversedById_key" ON "Transaction"("reversedById");

-- CreateIndex
CREATE INDEX "TransactionEntry_transactionId_idx" ON "TransactionEntry"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionEntry_financialAccountId_direction_idx" ON "TransactionEntry"("financialAccountId", "direction");

-- CreateIndex
CREATE INDEX "TransactionEntry_categoryId_idx" ON "TransactionEntry"("categoryId");

-- AddForeignKey
ALTER TABLE "TransactionEntry" ADD CONSTRAINT "TransactionEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEntry" ADD CONSTRAINT "TransactionEntry_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEntry" ADD CONSTRAINT "TransactionEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: derive a balanced pair of entries for every existing transaction.
-- INCOME: debit the account against the income category.
INSERT INTO "TransactionEntry" ("id", "transactionId", "financialAccountId", "categoryId", "direction", "amountMinor", "createdAt")
SELECT gen_random_uuid(), t."id", t."accountId", NULL, 'DEBIT', t."amountMinor", t."createdAt"
FROM "Transaction" t
WHERE t."type" = 'INCOME' AND t."accountId" IS NOT NULL;

INSERT INTO "TransactionEntry" ("id", "transactionId", "financialAccountId", "categoryId", "direction", "amountMinor", "createdAt")
SELECT gen_random_uuid(), t."id", NULL, t."categoryId", 'CREDIT', t."amountMinor", t."createdAt"
FROM "Transaction" t
WHERE t."type" = 'INCOME' AND t."categoryId" IS NOT NULL;

-- EXPENSE: debit the expense category against the account.
INSERT INTO "TransactionEntry" ("id", "transactionId", "financialAccountId", "categoryId", "direction", "amountMinor", "createdAt")
SELECT gen_random_uuid(), t."id", NULL, t."categoryId", 'DEBIT', t."amountMinor", t."createdAt"
FROM "Transaction" t
WHERE t."type" = 'EXPENSE' AND t."categoryId" IS NOT NULL;

INSERT INTO "TransactionEntry" ("id", "transactionId", "financialAccountId", "categoryId", "direction", "amountMinor", "createdAt")
SELECT gen_random_uuid(), t."id", t."accountId", NULL, 'CREDIT', t."amountMinor", t."createdAt"
FROM "Transaction" t
WHERE t."type" = 'EXPENSE' AND t."accountId" IS NOT NULL;

-- TRANSFER: debit the destination account against the source account.
INSERT INTO "TransactionEntry" ("id", "transactionId", "financialAccountId", "categoryId", "direction", "amountMinor", "createdAt")
SELECT gen_random_uuid(), t."id", t."transferToId", NULL, 'DEBIT', t."amountMinor", t."createdAt"
FROM "Transaction" t
WHERE t."type" = 'TRANSFER' AND t."transferToId" IS NOT NULL;

INSERT INTO "TransactionEntry" ("id", "transactionId", "financialAccountId", "categoryId", "direction", "amountMinor", "createdAt")
SELECT gen_random_uuid(), t."id", t."transferFromId", NULL, 'CREDIT', t."amountMinor", t."createdAt"
FROM "Transaction" t
WHERE t."type" = 'TRANSFER' AND t."transferFromId" IS NOT NULL;