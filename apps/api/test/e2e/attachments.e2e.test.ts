import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { adminPrisma } from "./admin-prisma.js";
import { createTestApp } from "./app.js";
import { FakeStorageService } from "./fake-storage.js";

let app: NestFastifyApplication;
let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;
const storage = new FakeStorageService();

function uniqueEmail(): string {
  return `e2e-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

async function truncateAll(): Promise<void> {
  await adminPrisma.$executeRawUnsafe(
    'TRUNCATE "user", "session", "account", "verification", "Tenant", "Membership", "UserSettings", "ServiceDefinition", "ServiceSubscription", "AuditLog", "FinancialAccount", "Category", "Budget", "Ledger", "Transaction", "TransactionEntry", "TransactionAttachment" RESTART IDENTITY CASCADE',
  );
  await adminPrisma.$executeRawUnsafe(
    `INSERT INTO "ServiceDefinition" ("id", "key", "name", "description", "createdAt", "updatedAt") VALUES
      (gen_random_uuid(), 'PERSONAL_FINANCE', 'Personal Finance', 'PF', now(), now()),
      (gen_random_uuid(), 'VEHICLE', 'Vehicle', 'V', now(), now()),
      (gen_random_uuid(), 'HOME', 'Home', 'H', now(), now()),
      (gen_random_uuid(), 'INSURANCE', 'Insurance', 'I', now(), now()),
      (gen_random_uuid(), 'ENTREPRENEURSHIP', 'Entrepreneurship', 'E', now(), now());`,
  );
}

async function signUp(): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(httpServer);
  await agent
    .post("/api/v1/auth/sign-up/email")
    .send({ name: "Attachment User", email: uniqueEmail(), password: "password123" })
    .expect(200);
  return agent;
}

async function createExpense(agent: ReturnType<typeof request.agent>): Promise<string> {
  const account = await agent
    .post("/api/v1/accounts")
    .send({ name: "Checking", type: "BANK", openingBalanceMinor: 100000 })
    .expect(201);
  const category = await agent
    .post("/api/v1/categories")
    .send({ name: "Office", type: "EXPENSE" })
    .expect(201);
  const transaction = await agent
    .post("/api/v1/transactions/expense")
    .send({
      accountId: account.body.id,
      categoryId: category.body.id,
      amountMinor: 1000,
      note: "Invoice",
    })
    .expect(201);
  return transaction.body.id as string;
}

beforeAll(async () => {
  app = await createTestApp(storage as never);
  httpServer = app.getHttpServer();
});

beforeEach(async () => {
  storage.clear();
  await truncateAll();
});

afterAll(async () => {
  await adminPrisma.$disconnect();
  await app.close();
});

describe("transaction attachments e2e", () => {
  it("supports upload, list, download URL and delete", async () => {
    const agent = await signUp();
    const transactionId = await createExpense(agent);

    const created = await agent
      .post(`/api/v1/transactions/${transactionId}/attachments`)
      .attach("file", pdf, { filename: "invoice.pdf", contentType: "application/pdf" })
      .expect(201);
    expect(created.body.originalName).toBe("invoice.pdf");
    expect(created.body.downloadUrl).toMatch(/^https:\/\/fake-storage\.local\//);

    const listed = await agent
      .get(`/api/v1/transactions/${transactionId}/attachments`)
      .expect(200);
    expect(listed.body.items).toHaveLength(1);

    await agent
      .delete(`/api/v1/transactions/${transactionId}/attachments/${created.body.id}`)
      .expect(204);
    expect(storage.objects.size).toBe(0);
  });

  it("isolates attachment listing and deletion across tenants", async () => {
    const agentA = await signUp();
    const agentB = await signUp();
    const transactionId = await createExpense(agentA);
    const created = await agentA
      .post(`/api/v1/transactions/${transactionId}/attachments`)
      .attach("file", pdf, { filename: "invoice.pdf", contentType: "application/pdf" })
      .expect(201);

    await agentB
      .get(`/api/v1/transactions/${transactionId}/attachments`)
      .expect(404);
    await agentB
      .delete(`/api/v1/transactions/${transactionId}/attachments/${created.body.id}`)
      .expect(404);
    expect(storage.objects.size).toBe(1);
  });

  it("limits attachments to five per transaction and rejects invalid files", async () => {
    const agent = await signUp();
    const transactionId = await createExpense(agent);

    await agent
      .post(`/api/v1/transactions/${transactionId}/attachments`)
      .attach("file", Buffer.from("not a pdf"), {
        filename: "invoice.pdf",
        contentType: "application/pdf",
      })
      .expect(400);

    for (let index = 0; index < 5; index += 1) {
      await agent
        .post(`/api/v1/transactions/${transactionId}/attachments`)
        .attach("file", pdf, {
          filename: `invoice-${index}.pdf`,
          contentType: "application/pdf",
        })
        .expect(201);
    }

    await agent
      .post(`/api/v1/transactions/${transactionId}/attachments`)
      .attach("file", pdf, { filename: "sixth.pdf", contentType: "application/pdf" })
      .expect(400);
  });

  it("returns 413 when an invoice exceeds the limit", async () => {
    const agent = await signUp();
    const transactionId = await createExpense(agent);
    const oversized = Buffer.concat([pdf, Buffer.alloc(storage.maxFileSizeBytes)]);

    const response = await agent
      .post(`/api/v1/transactions/${transactionId}/attachments`)
      .attach("file", oversized, {
        filename: "large.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(413);
    expect(response.body.error.message).toContain("maximum allowed size");
  });
});
