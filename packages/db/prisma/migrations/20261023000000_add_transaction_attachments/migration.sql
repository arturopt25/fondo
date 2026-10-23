-- CreateTable
CREATE TABLE "TransactionAttachment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "storageKey" VARCHAR(512) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(128) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionAttachment_tenantId_idx" ON "TransactionAttachment"("tenantId");

-- CreateIndex
CREATE INDEX "TransactionAttachment_transactionId_idx" ON "TransactionAttachment"("transactionId");

-- AddForeignKey
ALTER TABLE "TransactionAttachment" ADD CONSTRAINT "TransactionAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionAttachment" ADD CONSTRAINT "TransactionAttachment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Match the existing restricted application-role RLS pattern.
GRANT SELECT, INSERT, UPDATE, DELETE ON "TransactionAttachment" TO fondo_app;
ALTER TABLE "TransactionAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransactionAttachment" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "TransactionAttachment";
CREATE POLICY tenant_isolation ON "TransactionAttachment"
  FOR ALL TO fondo_app
  USING ("tenantId"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', true));
