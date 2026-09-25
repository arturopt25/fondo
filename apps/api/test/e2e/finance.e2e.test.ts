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
    'TRUNCATE "user", "session", "account", "verification", "Tenant", "Membership", "UserSettings", "ServiceDefinition", "ServiceSubscription", "AuditLog", "FinancialAccount", "Category", "Budget", "Ledger", "Transaction", "TransactionEntry" RESTART IDENTITY CASCADE',
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
        serviceKey: "PERSONAL_FINANCE",
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

  it("creates, aggregates, updates and deletes a monthly budget", async () => {
    const agent = await signUp(uniqueEmail());
    const account = await agent
      .post("/api/v1/accounts")
      .send({ name: "Cash", type: "CASH", openingBalanceMinor: 50000 })
      .expect(201);
    const expenseCategories = await agent
      .get("/api/v1/categories?type=EXPENSE")
      .expect(200);
    const categoryId = expenseCategories.body.items[0].id as string;

    await agent
      .post("/api/v1/transactions/expense")
      .send({
        accountId: account.body.id,
        categoryId,
        amountMinor: 25000,
      })
      .expect(201);

    const created = await agent
      .put("/api/v1/budgets")
      .send({ categoryId, period: "2026-09", amountMinor: 50000 })
      .expect(200);
    expect(created.body.categoryId).toBe(categoryId);
    expect(created.body.amountMinor).toBe(50000);

    const listed = await agent
      .get("/api/v1/budgets?from=2026-09&to=2026-09")
      .expect(200);
    const progress = listed.body.items.find(
      (item: { categoryId: string }) => item.categoryId === categoryId,
    );
    expect(progress).toMatchObject({
      budgetMinor: 50000,
      actualMinor: 25000,
      remainingMinor: 25000,
      utilizationPercent: 50,
    });

    await agent
      .put("/api/v1/budgets")
      .send({ categoryId, period: "2026-09", amountMinor: 60000 })
      .expect(200);
    const updated = await agent
      .get("/api/v1/budgets?from=2026-09&to=2026-09")
      .expect(200);
    expect(
      updated.body.items.find(
        (item: { categoryId: string }) => item.categoryId === categoryId,
      ).budgetMinor,
    ).toBe(60000);

    await agent.delete(`/api/v1/budgets/${created.body.id}`).expect(200);
    const afterDelete = await agent
      .get("/api/v1/budgets?from=2026-09&to=2026-09")
      .expect(200);
    expect(
      afterDelete.body.items.find(
        (item: { categoryId: string }) => item.categoryId === categoryId,
      ).budgetMinor,
    ).toBeNull();
  });

  it("isolates budgets across tenants", async () => {
    const agentA = await signUp(uniqueEmail());
    const agentB = await signUp(uniqueEmail());
    const categoriesA = await agentA
      .get("/api/v1/categories?type=EXPENSE")
      .expect(200);
    const categoryId = categoriesA.body.items[0].id as string;

    await agentA
      .put("/api/v1/budgets")
      .send({ categoryId, period: "2026-09", amountMinor: 50000 })
      .expect(200);

    const budgetsB = await agentB
      .get("/api/v1/budgets?from=2026-09&to=2026-09")
      .expect(200);
    expect(
      budgetsB.body.items.some(
        (item: { budgetMinor: number | null }) => item.budgetMinor !== null,
      ),
    ).toBe(false);
    await agentB.delete(`/api/v1/budgets/${categoryId}`).expect(404);
  });

  it("records a transfer between accounts and keeps the ledger total stable", async () => {
    const agent = await signUp(uniqueEmail());

    const source = await agent
      .post("/api/v1/accounts")
      .send({ name: "Source", type: "BANK", openingBalanceMinor: 50000 })
      .expect(201);
    const target = await agent
      .post("/api/v1/accounts")
      .send({ name: "Target", type: "BANK" })
      .expect(201);

    const transfer = await agent
      .post("/api/v1/transactions/transfer")
      .send({
        fromAccountId: source.body.id,
        toAccountId: target.body.id,
        amountMinor: 20000,
      })
      .expect(201);
    expect(transfer.body.type).toBe("TRANSFER");
    expect(transfer.body.entries).toHaveLength(2);

    const balance = await agent.get("/api/v1/ledger/balance").expect(200);
    expect(balance.body.totalMinor).toBe(50000);
    const byName = Object.fromEntries(
      balance.body.accounts.map(
        (account: { name: string; balanceMinor: number }) => [
          account.name,
          account.balanceMinor,
        ],
      ),
    );
    expect(byName["Source"]).toBe(30000);
    expect(byName["Target"]).toBe(20000);

    const list = await agent.get("/api/v1/transactions").expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].type).toBe("TRANSFER");
  });

  it("rejects a transfer that would overdraw a bank account", async () => {
    const agent = await signUp(uniqueEmail());

    const source = await agent
      .post("/api/v1/accounts")
      .send({ name: "Source", type: "BANK", openingBalanceMinor: 1000 })
      .expect(201);
    const target = await agent
      .post("/api/v1/accounts")
      .send({ name: "Target", type: "BANK" })
      .expect(201);

    await agent
      .post("/api/v1/transactions/transfer")
      .send({
        fromAccountId: source.body.id,
        toAccountId: target.body.id,
        amountMinor: 20000,
      })
      .expect(400);
  });

  it("models credit card spending as negative debt", async () => {
    const agent = await signUp(uniqueEmail());

    const card = await agent
      .post("/api/v1/accounts")
      .send({ name: "Card", type: "CREDIT_CARD" })
      .expect(201);
    const expenseCategories = await agent
      .get("/api/v1/categories?type=EXPENSE")
      .expect(200);

    await agent
      .post("/api/v1/transactions/expense")
      .send({
        accountId: card.body.id,
        categoryId: expenseCategories.body.items[0].id,
        amountMinor: 5000,
      })
      .expect(201);

    const balance = await agent.get("/api/v1/ledger/balance").expect(200);
    expect(balance.body.accounts[0].balanceMinor).toBe(-5000);
  });

  it("replays an idempotent create without duplicating", async () => {
    const agent = await signUp(uniqueEmail());

    const account = await agent
      .post("/api/v1/accounts")
      .send({ name: "Cash", type: "BANK" })
      .expect(201);
    const incomeCategories = await agent
      .get("/api/v1/categories?type=INCOME")
      .expect(200);
    const payload = {
      accountId: account.body.id,
      categoryId: incomeCategories.body.items[0].id,
      amountMinor: 100000,
    };

    const first = await agent
      .post("/api/v1/transactions/income")
      .set("Idempotency-Key", "retry-1")
      .send(payload)
      .expect(201);
    const second = await agent
      .post("/api/v1/transactions/income")
      .set("Idempotency-Key", "retry-1")
      .send(payload)
      .expect(201);

    expect(second.body.id).toBe(first.body.id);

    const list = await agent.get("/api/v1/transactions").expect(200);
    expect(list.body.total).toBe(1);
  });

  it("conflicts when an idempotency key is reused with different data", async () => {
    const agent = await signUp(uniqueEmail());

    const account = await agent
      .post("/api/v1/accounts")
      .send({ name: "Cash", type: "BANK" })
      .expect(201);
    const incomeCategories = await agent
      .get("/api/v1/categories?type=INCOME")
      .expect(200);

    await agent
      .post("/api/v1/transactions/income")
      .set("Idempotency-Key", "conflict-1")
      .send({
        accountId: account.body.id,
        categoryId: incomeCategories.body.items[0].id,
        amountMinor: 100000,
      })
      .expect(201);

    await agent
      .post("/api/v1/transactions/income")
      .set("Idempotency-Key", "conflict-1")
      .send({
        accountId: account.body.id,
        categoryId: incomeCategories.body.items[0].id,
        amountMinor: 99999,
      })
      .expect(409);
  });

  it("handles concurrent requests that share an idempotency key", async () => {
    const agent = await signUp(uniqueEmail());

    const account = await agent
      .post("/api/v1/accounts")
      .send({ name: "Cash", type: "BANK" })
      .expect(201);
    const incomeCategories = await agent
      .get("/api/v1/categories?type=INCOME")
      .expect(200);
    const payload = {
      accountId: account.body.id,
      categoryId: incomeCategories.body.items[0].id,
      amountMinor: 100000,
    };

    const results = await Promise.allSettled([
      agent
        .post("/api/v1/transactions/income")
        .set("Idempotency-Key", "concurrent-key")
        .send(payload),
      agent
        .post("/api/v1/transactions/income")
        .set("Idempotency-Key", "concurrent-key")
        .send(payload),
      agent
        .post("/api/v1/transactions/income")
        .set("Idempotency-Key", "concurrent-key")
        .send(payload),
    ]);

    const succeeded = results.filter(
      (result) => result.status === "fulfilled" && result.value.status === 201,
    );
    expect(succeeded.length).toBe(3);
    const ids = new Set(
      succeeded.map((result) => result.value.body.id as string),
    );
    expect(ids.size).toBe(1);

    const list = await agent.get("/api/v1/transactions").expect(200);
    expect(list.body.total).toBe(1);
  });

  it("serializes concurrent transfers and prevents double spending", async () => {
    const agent = await signUp(uniqueEmail());

    const source = await agent
      .post("/api/v1/accounts")
      .send({ name: "Source", type: "BANK", openingBalanceMinor: 1000 })
      .expect(201);
    const targetA = await agent
      .post("/api/v1/accounts")
      .send({ name: "A", type: "BANK" })
      .expect(201);
    const targetB = await agent
      .post("/api/v1/accounts")
      .send({ name: "B", type: "BANK" })
      .expect(201);

    const results = await Promise.allSettled([
      agent.post("/api/v1/transactions/transfer").send({
        fromAccountId: source.body.id,
        toAccountId: targetA.body.id,
        amountMinor: 600,
      }),
      agent.post("/api/v1/transactions/transfer").send({
        fromAccountId: source.body.id,
        toAccountId: targetB.body.id,
        amountMinor: 600,
      }),
    ]);

    const succeeded = results.filter(
      (result) => result.status === "fulfilled" && result.value.status === 201,
    );
    const rejected = results.filter(
      (result) => result.status === "fulfilled" && result.value.status === 400,
    );
    expect(succeeded.length).toBe(1);
    expect(rejected.length).toBe(1);

    const balance = await agent.get("/api/v1/ledger/balance").expect(200);
    const sourceAccount = balance.body.accounts.find(
      (account: { name: string }) => account.name === "Source",
    );
    expect(sourceAccount.balanceMinor).toBe(400);
  });

  it("rejects a transaction for a service that is not active", async () => {
    const agent = await signUp(uniqueEmail());

    const account = await agent
      .post("/api/v1/accounts")
      .send({ name: "Cash", type: "BANK" })
      .expect(201);
    const incomeCategories = await agent
      .get("/api/v1/categories?type=INCOME")
      .expect(200);

    await agent
      .post("/api/v1/transactions/income")
      .send({
        accountId: account.body.id,
        categoryId: incomeCategories.body.items[0].id,
        amountMinor: 1000,
        serviceKey: "VEHICLE",
      })
      .expect(400);
  });

  it("reverses an expense, restores the balance and rejects a second reversal", async () => {
    const agent = await signUp(uniqueEmail());

    const account = await agent
      .post("/api/v1/accounts")
      .send({ name: "Cash", type: "BANK", openingBalanceMinor: 50000 })
      .expect(201);
    const expenseCategories = await agent
      .get("/api/v1/categories?type=EXPENSE")
      .expect(200);

    const expense = await agent
      .post("/api/v1/transactions/expense")
      .send({
        accountId: account.body.id,
        categoryId: expenseCategories.body.items[0].id,
        amountMinor: 20000,
      })
      .expect(201);

    const reversal = await agent
      .post(`/api/v1/transactions/${expense.body.id}/reverse`)
      .send({ note: "Duplicated by accident" })
      .expect(201);
    expect(reversal.body.reversesId).toBe(expense.body.id);
    expect(reversal.body.entries).toHaveLength(2);

    const balance = await agent.get("/api/v1/ledger/balance").expect(200);
    expect(balance.body.accounts[0].balanceMinor).toBe(50000);

    const list = await agent.get("/api/v1/transactions").expect(200);
    const original = list.body.items.find(
      (transaction: { id: string }) => transaction.id === expense.body.id,
    );
    expect(original.reversedById).toBe(reversal.body.id);

    await agent
      .post(`/api/v1/transactions/${expense.body.id}/reverse`)
      .expect(400);
  });

  it("does not let another tenant reverse a transaction", async () => {
    const agentA = await signUp(uniqueEmail());

    const account = await agentA
      .post("/api/v1/accounts")
      .send({ name: "Cash", type: "BANK", openingBalanceMinor: 50000 })
      .expect(201);
    const expenseCategories = await agentA
      .get("/api/v1/categories?type=EXPENSE")
      .expect(200);
    const expense = await agentA
      .post("/api/v1/transactions/expense")
      .send({
        accountId: account.body.id,
        categoryId: expenseCategories.body.items[0].id,
        amountMinor: 1000,
      })
      .expect(201);

    const agentB = await signUp(uniqueEmail());
    await agentB
      .post(`/api/v1/transactions/${expense.body.id}/reverse`)
      .expect(404);
  });

  it("returns a dashboard report aggregated from real transactions", async () => {
    const agent = await signUp(uniqueEmail());

    const account = await agent
      .post("/api/v1/accounts")
      .send({ name: "Cash", type: "BANK", openingBalanceMinor: 50000 })
      .expect(201);
    const incomeCategories = await agent
      .get("/api/v1/categories?type=INCOME")
      .expect(200);
    const expenseCategories = await agent
      .get("/api/v1/categories?type=EXPENSE")
      .expect(200);

    await agent
      .post("/api/v1/transactions/income")
      .send({
        accountId: account.body.id,
        categoryId: incomeCategories.body.items[0].id,
        amountMinor: 100000,
      })
      .expect(201);
    await agent
      .post("/api/v1/transactions/expense")
      .send({
        accountId: account.body.id,
        categoryId: expenseCategories.body.items[0].id,
        amountMinor: 25000,
      })
      .expect(201);

    const now = new Date();
    const from = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();
    const to = now.toISOString();

    const report = await agent
      .get(
        `/api/v1/reports/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      )
      .expect(200);

    expect(report.body.balanceMinor).toBe(125000);
    expect(report.body.summary.incomeMinor).toBe(100000);
    expect(report.body.summary.expenseMinor).toBe(25000);
    expect(report.body.summary.savingsMinor).toBe(75000);
    expect(report.body.cashFlow).toHaveLength(1);
    expect(report.body.categorySpend[0].amountMinor).toBe(25000);
    expect(report.body.recent.length).toBeGreaterThanOrEqual(1);
    expect(report.body.exchangeRate.source).toBe("configured");
  });

  it("compensates reversed movements in reports", async () => {
    const agent = await signUp(uniqueEmail());

    const account = await agent
      .post("/api/v1/accounts")
      .send({ name: "Cash", type: "BANK", openingBalanceMinor: 50000 })
      .expect(201);
    const incomeCategories = await agent
      .get("/api/v1/categories?type=INCOME")
      .expect(200);

    const income = await agent
      .post("/api/v1/transactions/income")
      .send({
        accountId: account.body.id,
        categoryId: incomeCategories.body.items[0].id,
        amountMinor: 100000,
      })
      .expect(201);
    await agent
      .post(`/api/v1/transactions/${income.body.id}/reverse`)
      .expect(201);

    const now = new Date();
    const from = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();
    const report = await agent
      .get(
        `/api/v1/reports/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(now.toISOString())}`,
      )
      .expect(200);

    expect(report.body.summary.incomeMinor).toBe(0);
    expect(report.body.balanceMinor).toBe(50000);
  });

  it("filters dashboard reports by an active service", async () => {
    const agent = await signUp(uniqueEmail());

    const account = await agent
      .post("/api/v1/accounts")
      .send({ name: "Cash", type: "BANK" })
      .expect(201);
    const incomeCategories = await agent
      .get("/api/v1/categories?type=INCOME")
      .expect(200);
    const incomeCategoryId = incomeCategories.body.items[0].id as string;

    await agent
      .post("/api/v1/transactions/income")
      .send({
        accountId: account.body.id,
        categoryId: incomeCategoryId,
        amountMinor: 100000,
        serviceKey: "PERSONAL_FINANCE",
      })
      .expect(201);
    await agent
      .post("/api/v1/transactions/income")
      .send({
        accountId: account.body.id,
        categoryId: incomeCategoryId,
        amountMinor: 50000,
      })
      .expect(201);

    const now = new Date();
    const from = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();
    const report = await agent
      .get(
        `/api/v1/reports/dashboard?serviceKey=PERSONAL_FINANCE&from=${encodeURIComponent(from)}&to=${encodeURIComponent(now.toISOString())}`,
      )
      .expect(200);

    expect(report.body.summary.incomeMinor).toBe(100000);
  });
});
