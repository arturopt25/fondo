-- Add a capability dimension to transactions so movements can be assigned to a specific service capability.
ALTER TABLE "Transaction" ADD COLUMN "capabilityKey" VARCHAR(64);

-- Support service/capability balance lookups.
CREATE INDEX "Transaction_serviceKey_capabilityKey_idx" ON "Transaction"("serviceKey", "capabilityKey");