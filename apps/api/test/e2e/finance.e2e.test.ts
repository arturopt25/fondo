import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { prisma } from "@fondo/db";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestApp } from "./app.js";

let app: NestFastifyApplication;
let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;

function uniqueEmail(): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-finance-${suffix}@example.com`;
}

async function truncateAll(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "user", "session", "account", "verification", "Tenant", "Membership", "UserSettings", "ServiceDefinition", "ServiceSubscription", "AuditLog", "FinancialAccount", "Category", "Ledger", "Transaction" RESTART IDENTITY CASCADE',
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO "ServiceDefinition" ("id", "key", "name", "description", "createdAt", "updatedAt") VALUES
      (gen_random_uuid(), 'PERSONAL_FINANCE', 'Personal Finance', 'PF', now(), now()),
      (gen_random_uuid(), 'VEHICLE', 'Vehicle', 'V', now(), now()),
      (gen_random_uuid(), 'HOME', 'Home', 'H', now(), now()),
      (gen_random_uuid(), 'INSURANCE', 'Insurance', 'I', now(), now()),
      (gen_random_uuid(), 'ENTREPRENEURSHIP', 'Entrepreneurship', 'E', now(), now());`,
  );
}

async function signUp(
  email: string,
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(httpServer);
  await agent
    .post("/api/v1/auth/sign-up/email")
    .send({ name: "E2E User", email, password: "password123" })
    .expect(200);
  return agent;
}

beforeAll(async () => {
  app = await createTestApp();
  httpServer = app.getHttpServer();
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe("finance e2e", () => {
  it("seeds default categories at provisioning", async () => {
    const agent = await signUp(uniqueEmail());

    const categories = await agent.get("/api/v1/categories").expect(200);
    expect(categories.body.total).toBe(6);
    expect(
      categories.body.items.some(
        (category: { name: string; type: string; isDefault: boolean }) =>
          category.name === "Food" &&
          category.type === "EXPENSE" &&
          category.isDefault === true,
      ),
    ).toBe(true);
  });

  it("creates, lists and archives an account with audit", async () => {
    const agent = await signUp(uniqueEmail());

    const created = await agent
      .post("/api/v1/accounts")
      .send({
        name: "Savings",
        type: "BANK",
        currency: "USD",
        openingBalanceMinor: 50000,
      })
      .expect(201);

    const accountId = created.body.id as string;
    expect(created.body.name).toBe("Savings");

    const list = await agent.get("/api/v1/accounts").expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].id).toBe(accountId);

    await agent.post(`/api/v1/accounts/${accountId}/archive`).expect(201);

    const archived = await agent.get("/api/v1/accounts").expect(200);
    expect(archived.body.items[0].isActive).toBe(false);

    const auditCount = await prisma.auditLog.count({
      where: { action: "ACCOUNT_ARCHIVED", resource: `account:${accountId}` },
    });
    expect(auditCount).toBe(1);
  });

  it("isolates accounts across tenants", async () => {
    const agentA = await signUp(uniqueEmail());
    const agentB = await signUp(uniqueEmail());

    const created = await agentA
      .post("/api/v1/accounts")
      .send({ name: "Private", type: "CASH" })
      .expect(201);

    const bList = await agentB.get("/api/v1/accounts").expect(200);
    expect(bList.body.total).toBe(0);

    await agentB
      .post(`/api/v1/accounts/${created.body.id}/archive`)
      .expect(404);
  });

  it("creates a custom category and filters by type", async () => {
    const agent = await signUp(uniqueEmail());

    await agent
      .post("/api/v1/categories")
      .send({ name: "Travel", type: "EXPENSE" })
      .expect(201);

    const expenses = await agent
      .get("/api/v1/categories?type=EXPENSE")
      .expect(200);
    expect(
      expenses.body.items.some(
        (category: { name: string }) => category.name === "Travel",
      ),
    ).toBe(true);

    const income = await agent
      .get("/api/v1/categories?type=INCOME")
      .expect(200);
    expect(
      income.body.items.some(
        (category: { name: string }) => category.name === "Travel",
      ),
    ).toBe(false);
  });

  it("rejects an unknown account mutation from another tenant", async () => {
    const agentB = await signUp(uniqueEmail());

    await agentB
      .patch("/api/v1/accounts/00000000-0000-0000-0000-000000000000")
      .send({ name: "Hijacked" })
      .expect(404);
  });

  it("records income and expense and computes the ledger balance", async () => {
    const agent = await signUp(uniqueEmail());

    const account = await agent
      .post("/api/v1/accounts")
      .send({ name: "Cash", type: "CASH" })
      .expect(201);
    const accountId = account.body.id as string;

    const expenseCategories = await agent
      .get("/api/v1/categories?type=EXPENSE")
      .expect(200);
    const incomeCategories = await agent
      .get("/api/v1/categories?type=INCOME")
      .expect(200);
    const expenseCategoryId = expenseCategories.body.items[0].id as string;
    const incomeCategoryId = incomeCategories.body.items[0].id as string;

    await agent
      .post("/api/v1/transactions/income")
      .send({
        accountId,
        categoryId: incomeCategoryId,
        amountMinor: 100000,
        serviceKey: "ENTREPRENEURSHIP",
      })
      .expect(201);

    await agent
      .post("/api/v1/transactions/expense")
      .send({
        accountId,
        categoryId: expenseCategoryId,
        amountMinor: 25000,
      })
      .expect(201);

    const balance = await agent.get("/api/v1/ledger/balance").expect(200);
    expect(balance.body.totalMinor).toBe(75000);
    expect(balance.body.accounts).toHaveLength(1);
    expect(balance.body.accounts[0].balanceMinor).toBe(75000);

    const list = await agent.get("/api/v1/transactions").expect(200);
    expect(list.body.total).toBe(2);
  });
});
