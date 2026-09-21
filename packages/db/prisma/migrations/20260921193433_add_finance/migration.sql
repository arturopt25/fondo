-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK', 'CREDIT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "AccountType" NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "openingBalanceMinor" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "CategoryType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialAccount_tenantId_idx" ON "FinancialAccount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_tenantId_name_key" ON "FinancialAccount"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tenantId_name_type_key" ON "Category"("tenantId", "name", "type");

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default categories for tenants created before this migration
INSERT INTO "Category" ("id", "tenantId", "name", "type", "isDefault", "createdAt", "updatedAt")
SELECT gen_random_uuid(), t."id", v.name, v.type, true, now(), now()
FROM "Tenant" t
CROSS JOIN (VALUES
  ('Housing', 'EXPENSE'::"CategoryType"),
  ('Food', 'EXPENSE'),
  ('Transport', 'EXPENSE'),
  ('Leisure', 'EXPENSE'),
  ('Other', 'EXPENSE'),
  ('Income', 'INCOME')
) AS v(name, type)
ON CONFLICT ("tenantId", "name", "type") DO NOTHING;
