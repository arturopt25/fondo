-- CreateEnum
CREATE TYPE "ServiceKey" AS ENUM ('PERSONAL_FINANCE', 'VEHICLE', 'HOME', 'INSURANCE', 'ENTREPRENEURSHIP');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- DropIndex
DROP INDEX "Tenant_ownerUserId_idx";

-- CreateTable
CREATE TABLE "ServiceDefinition" (
    "id" UUID NOT NULL,
    "key" "ServiceKey" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSubscription" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "actorId" TEXT,
    "action" VARCHAR(64) NOT NULL,
    "resource" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDefinition_key_key" ON "ServiceDefinition"("key");

-- CreateIndex
CREATE INDEX "ServiceSubscription_serviceId_idx" ON "ServiceSubscription"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSubscription_tenantId_serviceId_key" ON "ServiceSubscription"("tenantId", "serviceId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ServiceSubscription" ADD CONSTRAINT "ServiceSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSubscription" ADD CONSTRAINT "ServiceSubscription_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the service catalog
INSERT INTO "ServiceDefinition" ("id", "key", "name", "description", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'PERSONAL_FINANCE', 'Personal Finance', 'Accounts, movement, budgets and a complete read on your balance.', now(), now()),
  (gen_random_uuid(), 'VEHICLE', 'Vehicle', 'Fuel, maintenance, documents and reminders for your vehicle.', now(), now()),
  (gen_random_uuid(), 'HOME', 'Home', 'Home expenses, payments, maintenance and recurring tasks.', now(), now()),
  (gen_random_uuid(), 'INSURANCE', 'Insurance', 'Policies, coverage, payments and important dates in one place.', now(), now()),
  (gen_random_uuid(), 'ENTREPRENEURSHIP', 'Entrepreneurship', 'Income, expenses and metrics for your business finances.', now(), now());

-- Enable Personal Finance for tenants created before this migration
INSERT INTO "ServiceSubscription" ("id", "tenantId", "serviceId", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid(), t."id", sd."id", 'ACTIVE', now(), now()
FROM "Tenant" t
JOIN "ServiceDefinition" sd ON sd."key" = 'PERSONAL_FINANCE'
ON CONFLICT ("tenantId", "serviceId") DO NOTHING;
