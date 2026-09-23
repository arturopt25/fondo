import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportsService } from "../../../core/finance/reports.service.js";

function createContext() {
  const repo = { categoryRows: vi.fn() };
  const transactions = { entryBalanceDelta: vi.fn() };
  const transactionService = { listRecent: vi.fn() };
  const ledgers = { personalLedger: vi.fn() };
  const prisma = {
    client: {
      ledger: { findFirst: vi.fn() },
    },
  };
  const service = new ReportsService(
    repo as never,
    transactions as never,
    transactionService as never,
    ledgers as never,
    prisma as never,
  );
  return { repo, transactions, transactionService, ledgers, prisma, service };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    direction: "CREDIT",
    amountMinor: 1000,
    occurredAt: new Date("2026-09-05T00:00:00.000Z"),
    serviceKey: null,
    categoryId: "cat-income",
    categoryName: "Income",
    categoryType: "INCOME",
    ...overrides,
  };
}

describe("ReportsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates summary, cash flow and category spend from entries", async () => {
    const { repo, transactions, transactionService, ledgers, prisma, service } =
      createContext();
    ledgers.personalLedger.mockResolvedValue({ id: "ledger-1" });
    repo.categoryRows.mockResolvedValue([
      row({
        direction: "CREDIT",
        amountMinor: 100000,
        categoryId: "cat-income",
        categoryName: "Income",
        categoryType: "INCOME",
      }),
      row({
        direction: "DEBIT",
        amountMinor: 40000,
        categoryId: "cat-food",
        categoryName: "Food",
        categoryType: "EXPENSE",
        occurredAt: new Date("2026-09-06T00:00:00.000Z"),
      }),
    ]);
    transactions.entryBalanceDelta.mockResolvedValue(
      new Map([["acc-1", 60000]]),
    );
    prisma.client.ledger.findFirst.mockResolvedValue({
      id: "ledger-1",
      accounts: [{ id: "acc-1", openingBalanceMinor: 1000 }],
    });
    transactionService.listRecent.mockResolvedValue([]);

    const result = await service.dashboard("tenant-1", "UTC", {});

    expect(result.balanceMinor).toBe(61000);
    expect(result.summary).toEqual({
      incomeMinor: 100000,
      expenseMinor: 40000,
      savingsMinor: 60000,
      savingsRate: 60,
    });
    expect(result.cashFlow).toEqual([
      { bucket: "2026-09", incomeMinor: 100000, expenseMinor: 40000 },
    ]);
    expect(result.categorySpend).toEqual([
      { categoryId: "cat-food", categoryName: "Food", amountMinor: 40000 },
    ]);
    expect(result.exchangeRate).not.toBeNull();
  });

  it("cancels income and expenses when movements are reversed", async () => {
    const { repo, transactions, transactionService, ledgers, prisma, service } =
      createContext();
    ledgers.personalLedger.mockResolvedValue({ id: "ledger-1" });
    transactions.entryBalanceDelta.mockResolvedValue(new Map());
    prisma.client.ledger.findFirst.mockResolvedValue({
      id: "ledger-1",
      accounts: [],
    });
    transactionService.listRecent.mockResolvedValue([]);
    repo.categoryRows.mockResolvedValue([
      row({
        direction: "CREDIT",
        amountMinor: 100000,
        categoryType: "INCOME",
      }),
      row({
        direction: "DEBIT",
        amountMinor: 100000,
        categoryType: "INCOME",
      }),
      row({
        direction: "DEBIT",
        amountMinor: 5000,
        categoryId: "cat-food",
        categoryName: "Food",
        categoryType: "EXPENSE",
      }),
      row({
        direction: "CREDIT",
        amountMinor: 5000,
        categoryId: "cat-food",
        categoryName: "Food",
        categoryType: "EXPENSE",
      }),
    ]);

    const result = await service.dashboard("tenant-1", "UTC", {
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.000Z",
    });

    expect(result.summary.incomeMinor).toBe(0);
    expect(result.summary.expenseMinor).toBe(0);
    expect(result.summary.savingsMinor).toBe(0);
  });

  it("buckets cash flow by month in the tenant timezone", async () => {
    const { repo, ledgers, service } = createContext();
    ledgers.personalLedger.mockResolvedValue({ id: "ledger-1" });
    repo.categoryRows.mockResolvedValue([
      row({
        direction: "CREDIT",
        amountMinor: 1000,
        categoryType: "INCOME",
        occurredAt: new Date("2026-07-31T23:00:00.000Z"),
      }),
      row({
        direction: "CREDIT",
        amountMinor: 2000,
        categoryType: "INCOME",
        occurredAt: new Date("2026-08-01T01:00:00.000Z"),
      }),
    ]);

    const result = await service.cashFlow("tenant-1", "UTC", {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.000Z",
    });

    expect(result.items).toEqual([
      { bucket: "2026-07", incomeMinor: 1000, expenseMinor: 0 },
      { bucket: "2026-08", incomeMinor: 2000, expenseMinor: 0 },
    ]);
  });

  it("filters cash flow by a service key", async () => {
    const { repo, ledgers, service } = createContext();
    ledgers.personalLedger.mockResolvedValue({ id: "ledger-1" });
    repo.categoryRows.mockResolvedValue([]);

    await service.cashFlow("tenant-1", "UTC", {
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.000Z",
      serviceKey: "PERSONAL_FINANCE",
    });

    expect(repo.categoryRows).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        serviceKey: "PERSONAL_FINANCE",
        ledgerId: "ledger-1",
      }),
    );
  });
});
