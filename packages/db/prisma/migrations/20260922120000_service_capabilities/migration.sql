-- CreateEnum
CREATE TYPE "ServiceLedgerMode" AS ENUM ('SHARED', 'SEPARATE');

-- AlterTable
ALTER TABLE "ServiceSubscription" ADD COLUMN "ledgerMode" "ServiceLedgerMode" NOT NULL DEFAULT 'SHARED';

-- CreateTable
CREATE TABLE "ServiceCapabilityDefinition" (
    "id" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dependsOn" TEXT[] NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCapabilityDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCapabilitySelection" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "capabilityId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCapabilitySelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCapabilityDefinition_serviceId_key_key" ON "ServiceCapabilityDefinition"("serviceId", "key");

-- CreateIndex
CREATE INDEX "ServiceCapabilityDefinition_serviceId_idx" ON "ServiceCapabilityDefinition"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCapabilitySelection_subscriptionId_capabilityId_key" ON "ServiceCapabilitySelection"("subscriptionId", "capabilityId");

-- CreateIndex
CREATE INDEX "ServiceCapabilitySelection_capabilityId_idx" ON "ServiceCapabilitySelection"("capabilityId");

-- AddForeignKey
ALTER TABLE "ServiceCapabilityDefinition" ADD CONSTRAINT "ServiceCapabilityDefinition_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCapabilitySelection" ADD CONSTRAINT "ServiceCapabilitySelection_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ServiceSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCapabilitySelection" ADD CONSTRAINT "ServiceCapabilitySelection_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "ServiceCapabilityDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the capability catalog per service.
INSERT INTO "ServiceCapabilityDefinition" ("id", "serviceId", "key", "name", "description", "required", "defaultEnabled", "dependsOn", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), sd."id", c."key", c."name", c."description", c."required", c."defaultEnabled", c."dependsOn", c."sortOrder", now(), now()
FROM "ServiceDefinition" sd
JOIN (
  VALUES
    ('PERSONAL_FINANCE', 'accounts',   'Accounts and balances',       'Manage financial accounts and balances',                             true,  true,  '{}'::text[], 1),
    ('PERSONAL_FINANCE', 'categories', 'Categories',                   'Organize movements into categories',                                 true,  true,  '{}'::text[], 2),
    ('PERSONAL_FINANCE', 'income',     'Income',                       'Record income movements',                                           true,  true,  '{}'::text[], 3),
    ('PERSONAL_FINANCE', 'expenses',   'Expenses',                     'Record expense movements',                                          true,  true,  '{}'::text[], 4),
    ('PERSONAL_FINANCE', 'transfers',  'Transfers',                    'Move money between accounts',                                       true,  true,  '{}'::text[], 5),
    ('PERSONAL_FINANCE', 'budgets',    'Budgets',                      'Set budgets per category and period',                               false, true,  '{expenses}'::text[], 6),
    ('PERSONAL_FINANCE', 'cashflow',   'Cash flow',                    'Track cash flow over time',                                         false, true,  '{income,expenses}'::text[], 7),
    ('PERSONAL_FINANCE', 'reports',    'Reports',                      'Period reports and analytics',                                      false, true,  '{income,expenses}'::text[], 8),
    ('PERSONAL_FINANCE', 'recurring',  'Recurring movements',          'Repeat scheduled movements',                                        false, false, '{expenses}'::text[], 9),
    ('VEHICLE',          'vehicles',   'Vehicles',                     'Register and manage vehicles',                                      true,  true,  '{}'::text[], 1),
    ('VEHICLE',          'expenses',   'Vehicle expenses',             'Record expenses linked to a vehicle',                               true,  true,  '{}'::text[], 2),
    ('VEHICLE',          'mileage',    'Mileage tracking',             'Track odometer and distance',                                       false, true,  '{vehicles}'::text[], 3),
    ('VEHICLE',          'fuel',       'Fuel and consumption',         'Log fuel ups and consumption',                                      false, true,  '{vehicles,mileage}'::text[], 4),
    ('VEHICLE',          'maintenance','Maintenance',                  'Schedule and record maintenance',                                   false, true,  '{vehicles}'::text[], 5),
    ('VEHICLE',          'documents',  'Documents and due dates',      'Store documents and expirations',                                   false, false, '{vehicles}'::text[], 6),
    ('VEHICLE',          'reminders',  'Reminders',                    'Reminders for maintenance and due dates',                            false, false, '{vehicles,maintenance}'::text[], 7),
    ('HOME',             'properties', 'Properties',                   'Register and manage properties',                                    true,  true,  '{}'::text[], 1),
    ('HOME',             'expenses',   'Home expenses',                'Record household expenses',                                         true,  true,  '{}'::text[], 2),
    ('HOME',             'recurring',  'Recurring utilities',          'Track electricity, water, internet and more',                       false, true,  '{expenses}'::text[], 3),
    ('HOME',             'maintenance','Maintenance',                  'Record maintenance and repairs',                                    false, true,  '{expenses}'::text[], 4),
    ('HOME',             'inventory',  'Asset inventory',              'Inventory of household goods',                                      false, false, '{properties}'::text[], 5),
    ('HOME',             'documents',  'Property documents',           'Store documents and warranties',                                    false, false, '{properties}'::text[], 6),
    ('INSURANCE',        'policies',   'Policies',                     'Register and manage insurance policies',                             true,  true,  '{}'::text[], 1),
    ('INSURANCE',        'insuredItems','Insured items',               'Track what is insured',                                             true,  true,  '{policies}'::text[], 2),
    ('INSURANCE',        'premiums',   'Premiums',                     'Record premium payments',                                           true,  true,  '{policies}'::text[], 3),
    ('INSURANCE',        'coverage',   'Coverage, limits and deductibles','Coverage details per policy',                                   false, true,  '{policies}'::text[], 4),
    ('INSURANCE',        'renewals',   'Renewals',                     'Track upcoming renewals',                                           false, true,  '{policies,premiums}'::text[], 5),
    ('INSURANCE',        'claims',     'Claims',                       'Register claims with status and amounts',                            false, true,  '{policies}'::text[], 6),
    ('INSURANCE',        'documents',  'Policy documents',             'Store policy documents',                                            false, false, '{policies}'::text[], 7),
    ('ENTREPRENEURSHIP', 'business',   'Business profile',             'Register the business',                                             true,  true,  '{}'::text[], 1),
    ('ENTREPRENEURSHIP', 'income',     'Business income',              'Record business income',                                            true,  true,  '{}'::text[], 2),
    ('ENTREPRENEURSHIP', 'expenses',   'Business expenses',            'Record business expenses',                                          true,  true,  '{}'::text[], 3),
    ('ENTREPRENEURSHIP', 'accounts',   'Business accounts',            'Manage separate business accounts',                                 false, true,  '{business}'::text[], 4),
    ('ENTREPRENEURSHIP', 'clients',    'Clients',                      'Manage clients',                                                    false, true,  '{business}'::text[], 5),
    ('ENTREPRENEURSHIP', 'projects',   'Projects',                     'Manage projects',                                                   false, true,  '{business,clients}'::text[], 6),
    ('ENTREPRENEURSHIP', 'invoicing',  'Invoicing',                    'Generate invoices',                                                 false, false, '{business,clients}'::text[], 7),
    ('ENTREPRENEURSHIP', 'taxes',      'Taxes',                        'Track taxes',                                                       false, false, '{business,income,expenses}'::text[], 8)
) AS c(serviceKey, "key", "name", "description", "required", "defaultEnabled", "dependsOn", "sortOrder")
ON sd."key"::text = c.serviceKey;

-- Backfill selections for existing subscriptions (only required + default enabled capabilities).
INSERT INTO "ServiceCapabilitySelection" ("id", "subscriptionId", "capabilityId", "enabled", "createdAt", "updatedAt")
SELECT gen_random_uuid(), sub."id", cap."id", true, now(), now()
FROM "ServiceSubscription" sub
JOIN "ServiceCapabilityDefinition" cap ON cap."serviceId" = sub."serviceId"
WHERE cap."required" = true OR cap."defaultEnabled" = true
ON CONFLICT ("subscriptionId", "capabilityId") DO NOTHING;