-- A tenant can have at most one personal ledger. The existing
-- @@unique([tenantId, businessId]) does not enforce this because PostgreSQL
-- treats NULL businessId values as distinct, so multiple PERSONAL ledgers
-- could be created for the same tenant under concurrency.
--
-- Prisma does not model partial unique indexes in schema.prisma. This index is
-- managed by this raw migration; use `prisma migrate deploy` (not
-- `prisma migrate dev`) against databases where it has been applied.
CREATE UNIQUE INDEX "Ledger_tenantId_personal_key"
  ON "Ledger" ("tenantId")
  WHERE "scope" = 'PERSONAL';
