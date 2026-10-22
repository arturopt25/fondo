-- Create a dedicated, non-superuser application role for the runtime.
-- The password is a placeholder; the real password must be set via
-- `ALTER ROLE fondo_app WITH PASSWORD '...'` during local setup, CI or deployment.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fondo_app') THEN
    CREATE ROLE fondo_app WITH LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD 'change-me';
  END IF;
END
$$;

-- Database and schema access.
-- current_database() cannot be used directly in GRANT, so execute it dynamically.
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO fondo_app', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO fondo_app;

-- Existing objects.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fondo_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO fondo_app;

-- Future objects created by migrations (which run as the owner role).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fondo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO fondo_app;

-- Force RLS on every tenant-scoped table.
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Membership" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Ledger" FORCE ROW LEVEL SECURITY;
ALTER TABLE "FinancialAccount" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Category" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Budget" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TransactionEntry" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ServiceSubscription" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ServiceCapabilitySelection" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

-- Tenant-scoped isolation by the tenant id set at the start of each transaction.
DROP POLICY IF EXISTS tenant_isolation ON "Tenant";
CREATE POLICY tenant_isolation ON "Tenant"
  FOR ALL TO fondo_app
  USING ("id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("id"::text = current_setting('app.tenant_id', true));

-- Membership is resolved from the authenticated user id before the tenant is known,
-- so it is isolated by user id rather than tenant id.
DROP POLICY IF EXISTS membership_own_rows ON "Membership";
CREATE POLICY membership_own_rows ON "Membership"
  FOR ALL TO fondo_app
  USING ("userId" = current_setting('app.user_id', true));

DROP POLICY IF EXISTS tenant_isolation ON "Ledger";
CREATE POLICY tenant_isolation ON "Ledger"
  FOR ALL TO fondo_app
  USING ("tenantId"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation ON "FinancialAccount";
CREATE POLICY tenant_isolation ON "FinancialAccount"
  FOR ALL TO fondo_app
  USING ("tenantId"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation ON "Category";
CREATE POLICY tenant_isolation ON "Category"
  FOR ALL TO fondo_app
  USING ("tenantId"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation ON "Budget";
CREATE POLICY tenant_isolation ON "Budget"
  FOR ALL TO fondo_app
  USING ("tenantId"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation ON "Transaction";
CREATE POLICY tenant_isolation ON "Transaction"
  FOR ALL TO fondo_app
  USING ("tenantId"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', true));

-- Transaction entries do not carry a tenant id; inherit it from their transaction.
DROP POLICY IF EXISTS entry_tenant_isolation ON "TransactionEntry";
CREATE POLICY entry_tenant_isolation ON "TransactionEntry"
  FOR ALL TO fondo_app
  USING (EXISTS (
    SELECT 1 FROM "Transaction" t
    WHERE t.id = "TransactionEntry"."transactionId"
      AND t."tenantId"::text = current_setting('app.tenant_id', true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "Transaction" t
    WHERE t.id = "TransactionEntry"."transactionId"
      AND t."tenantId"::text = current_setting('app.tenant_id', true)
  ));

DROP POLICY IF EXISTS tenant_isolation ON "ServiceSubscription";
CREATE POLICY tenant_isolation ON "ServiceSubscription"
  FOR ALL TO fondo_app
  USING ("tenantId"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', true));

-- Capability selections inherit tenant scope from their subscription.
DROP POLICY IF EXISTS selection_tenant_isolation ON "ServiceCapabilitySelection";
CREATE POLICY selection_tenant_isolation ON "ServiceCapabilitySelection"
  FOR ALL TO fondo_app
  USING (EXISTS (
    SELECT 1 FROM "ServiceSubscription" s
    WHERE s.id = "ServiceCapabilitySelection"."subscriptionId"
      AND s."tenantId"::text = current_setting('app.tenant_id', true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "ServiceSubscription" s
    WHERE s.id = "ServiceCapabilitySelection"."subscriptionId"
      AND s."tenantId"::text = current_setting('app.tenant_id', true)
  ));

DROP POLICY IF EXISTS audit_tenant_isolation ON "AuditLog";
CREATE POLICY audit_tenant_isolation ON "AuditLog"
  FOR ALL TO fondo_app
  USING ("tenantId"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', true));
