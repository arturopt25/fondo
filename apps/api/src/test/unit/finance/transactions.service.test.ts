import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TransactionsService } from "../../../core/finance/transactions.service.js";

function createMocks() {
  const repo = {
    list: vi.fn(),
    create: vi.fn(),
    accountFlows: vi.fn(),
  };
  const ledgers = { personalLedger: vi.fn() };
  const auditLogCreate = vi.fn();
  const accountFindFirst = vi.fn();
  const categoryFindFirst = vi.fn();
  const ledgerFindFirst = vi.fn();
  const prisma = {
    client: {
      auditLog: { create: auditLogCreate },
      financialAccount: { findFirst: accountFindFirst },
      category: { findFirst: categoryFindFirst },
      ledger: { findFirst: ledgerFindFirst },
    },
  };
  const service = new TransactionsService(
    repo as never,
    ledgers as never,
    prisma as never,
  );
  return {
    repo,
    ledgers,
    auditLogCreate,
    accountFindFirst,
    categoryFindFirst,
    ledgerFindFirst,
    service,
  };
}

function tx(id = "tx-1") {
  return {
    id,
    type: "INCOME",
    amountMinor: 1000,
    categoryId: "cat-1",
    accountId: "acc-1",
    transferFromId: null,
    transferToId: null,
    serviceKey: null,
    sourceType: null,
    sourceId: null,
    note: null,
    occurredAt: new Date("2026-09-01T00:00:00.000Z"),
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
  };
}

describe("TransactionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an income transaction with a service context", async () => {
    const {
      repo,
      auditLogCreate,
      accountFindFirst,
      categoryFindFirst,
      service,
    } = createMocks();
    accountFindFirst.mockResolvedValue({ id: "acc-1", ledgerId: "ledger-1" });
    categoryFindFirst.mockResolvedValue({ id: "cat-1" });
    repo.create.mockResolvedValue(tx());

    const result = await service.createIncome("tenant-1", "user-1", {
      accountId: "acc-1",
      categoryId: "cat-1",
      amountMinor: 1000,
      serviceKey: "VEHICLE",
      sourceType: "VEHICLE",
      sourceId: "vehicle-1",
    });

    expect(result.type).toBe("INCOME");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        ledgerId: "ledger-1",
        type: "INCOME",
        amountMinor: 1000,
        accountId: "acc-1",
        serviceKey: "VEHICLE",
        sourceType: "VEHICLE",
        sourceId: "vehicle-1",
      }),
    );
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "INCOME_CREATED" }),
    });
  });

  it("creates an expense transaction", async () => {
    const { repo, accountFindFirst, categoryFindFirst, service } =
      createMocks();
    accountFindFirst.mockResolvedValue({ id: "acc-1", ledgerId: "ledger-1" });
    categoryFindFirst.mockResolvedValue({ id: "cat-1" });
    repo.create.mockResolvedValue({ ...tx(), type: "EXPENSE" });

    const result = await service.createExpense("tenant-1", "user-1", {
      accountId: "acc-1",
      categoryId: "cat-1",
      amountMinor: 500,
    });

    expect(result.type).toBe("EXPENSE");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "EXPENSE", amountMinor: 500 }),
    );
  });

  it("rejects an expense with an unknown account", async () => {
    const { accountFindFirst, service } = createMocks();
    accountFindFirst.mockResolvedValue(null);

    await expect(
      service.createExpense("tenant-1", "user-1", {
        accountId: "missing",
        categoryId: "cat-1",
        amountMinor: 500,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects an expense with an unknown category", async () => {
    const { accountFindFirst, categoryFindFirst, service } = createMocks();
    accountFindFirst.mockResolvedValue({ id: "acc-1", ledgerId: "ledger-1" });
    categoryFindFirst.mockResolvedValue(null);

    await expect(
      service.createExpense("tenant-1", "user-1", {
        accountId: "acc-1",
        categoryId: "missing",
        amountMinor: 500,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("creates a transfer between accounts of the same ledger", async () => {
    const { repo, accountFindFirst, service } = createMocks();
    accountFindFirst.mockResolvedValueOnce({
      id: "from-1",
      ledgerId: "ledger-1",
    });
    accountFindFirst.mockResolvedValueOnce({
      id: "to-1",
      ledgerId: "ledger-1",
    });
    repo.create.mockResolvedValue({
      ...tx(),
      type: "TRANSFER",
      transferFromId: "from-1",
      transferToId: "to-1",
    });

    const result = await service.createTransfer("tenant-1", "user-1", {
      fromAccountId: "from-1",
      toAccountId: "to-1",
      amountMinor: 2000,
    });

    expect(result.type).toBe("TRANSFER");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TRANSFER",
        transferFromId: "from-1",
        transferToId: "to-1",
      }),
    );
  });

  it("rejects a transfer to the same account", async () => {
    const { service } = createMocks();

    await expect(
      service.createTransfer("tenant-1", "user-1", {
        fromAccountId: "acc-1",
        toAccountId: "acc-1",
        amountMinor: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("lists transactions defaulting to the personal ledger", async () => {
    const { repo, ledgers, service } = createMocks();
    ledgers.personalLedger.mockResolvedValue({ id: "ledger-1" });
    repo.list.mockResolvedValue({ items: [tx()], total: 1 });

    const result = await service.list("tenant-1", { page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(repo.list).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ ledgerId: "ledger-1" }),
    );
  });

  it("computes the balance from opening and flows", async () => {
    const { ledgerFindFirst, repo, service } = createMocks();
    ledgerFindFirst.mockResolvedValue({
      id: "ledger-1",
      accounts: [
        { id: "acc-1", name: "Cash", openingBalanceMinor: 1000 },
        { id: "acc-2", name: "Savings", openingBalanceMinor: 5000 },
      ],
    });
    repo.accountFlows.mockResolvedValue({
      income: new Map([["acc-1", 2000]]),
      expense: new Map([["acc-1", 500]]),
      transferIn: new Map([["acc-2", 1000]]),
      transferOut: new Map([["acc-1", 1000]]),
    });

    const result = await service.balance("tenant-1", "ledger-1");

    expect(result.totalMinor).toBe(7500);
    expect(result.accounts[0]).toEqual({
      id: "acc-1",
      name: "Cash",
      balanceMinor: 1500,
    });
    expect(result.accounts[1]).toEqual({
      id: "acc-2",
      name: "Savings",
      balanceMinor: 6000,
    });
  });
});
