-- The original RLS migration applied FORCE without ENABLE. In PostgreSQL,
-- FORCE ROW LEVEL SECURITY has no effect unless row security is enabled.
-- Enable RLS on the tables that already define tenant policies.

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'AuditLog',
    'Budget',
    'Category',
    'FinancialAccount',
    'Ledger',
    'Membership',
    'ServiceCapabilitySelection',
    'ServiceSubscription',
    'Tenant',
    'Transaction',
    'TransactionEntry'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = target_table
        AND c.relrowsecurity = true
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
        target_table
      );
    END IF;
  END LOOP;
END
$$;
