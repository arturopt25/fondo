import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TransactionsService } from "../../../core/finance/transactions.service.js";

type Tx = ReturnType<typeof createTx>;

function createTx() {
  return {
    $queryRaw: vi.fn(),
    financialAccount: { findFirst: vi.fn(), findMany: vi.fn() },
    category: { findFirst: vi.fn() },
    serviceSubscription: { findFirst: vi.fn() },
    serviceDefinition: { findUnique: vi.fn() },
    transaction: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    transactionEntry: { groupBy: vi.fn() },
    auditLog: { create: vi.fn() },
  };
}

function createContext() {
  const tx = createTx();
  const repo = {
    list: vi.fn(),
    entryBalanceDelta: vi.fn(),
  };
  const ledgers = { personalLedger: vi.fn() };
  const prisma = {
    client: {
      ledger: { findFirst: vi.fn() },
    },
    withTransaction: vi.fn((callback: (client: Tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  const service = new TransactionsService(
    repo as never,
    ledgers as never,
    prisma as never,
  );
  return { tx, repo, ledgers, prisma, service };
}

function account(
  id: string,
  overrides: {
    ledgerId?: string;
    type?: string;
    openingBalanceMinor?: number;
    isActive?: boolean;
  } = {},
) {
  return {
    id,
    ledgerId: overrides.ledgerId ?? "ledger-1",
    type: overrides.type ?? "BANK",
    openingBalanceMinor: overrides.openingBalanceMinor ?? 0,
    isActive: overrides.isActive ?? true,
    name: "Cash",
    tenantId: "tenant-1",
    currency: "USD",
  };
}

function category(id: string, type: "INCOME" | "EXPENSE") {
  return { id, tenantId: "tenant-1", type, isActive: true, name: "Category" };
}

function txRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: "INCOME",
    amountMinor: 1000,
    categoryId: null,
    accountId: null,
    transferFromId: null,
    transferToId: null,
    serviceKey: null,
    sourceType: null,
    sourceId: null,
    note: null,
    occurredAt: new Date("2026-09-01T00:00:00.000Z"),
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    reversesId: null,
    reversedById: null,
    entries: [],
    ...overrides,
  };
}

function hashPayload(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

describe("TransactionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an income with balanced debit/credit entries and audit", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(account("acc-1"));
    tx.category.findFirst.mockResolvedValue(category("cat-1", "INCOME"));
    tx.serviceSubscription.findFirst.mockResolvedValue(null);
    tx.transaction.findUnique.mockResolvedValue(null);
    tx.transactionEntry.groupBy.mockResolvedValue([]);
    tx.$queryRaw.mockResolvedValue([]);
    tx.transaction.create.mockResolvedValue(
      txRow("tx-1", {
        accountId: "acc-1",
        categoryId: "cat-1",
        entries: [
          {
            id: "e1",
            financialAccountId: "acc-1",
            categoryId: null,
            direction: "DEBIT",
            amountMinor: 1000,
          },
          {
            id: "e2",
            financialAccountId: null,
            categoryId: "cat-1",
            direction: "CREDIT",
            amountMinor: 1000,
          },
        ],
      }),
    );

    const result = await service.createIncome("tenant-1", "user-1", {
      accountId: "acc-1",
      categoryId: "cat-1",
      amountMinor: 1000,
    });

    expect(result.type).toBe("INCOME");
    expect(result.entries).toHaveLength(2);
    expect(tx.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "INCOME",
          ledgerId: "ledger-1",
          accountId: "acc-1",
          categoryId: "cat-1",
          entries: {
            create: expect.arrayContaining([
              expect.objectContaining({
                direction: "DEBIT",
                amountMinor: 1000,
              }),
              expect.objectContaining({
                direction: "CREDIT",
                amountMinor: 1000,
              }),
            ]),
          },
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "INCOME_CREATED" }),
      }),
    );
  });

  it("creates an expense debiting the category and crediting the account", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(
      account("acc-1", { openingBalanceMinor: 1000 }),
    );
    tx.category.findFirst.mockResolvedValue(category("cat-1", "EXPENSE"));
    tx.serviceSubscription.findFirst.mockResolvedValue(null);
    tx.transaction.findUnique.mockResolvedValue(null);
    tx.transactionEntry.groupBy.mockResolvedValue([]);
    tx.$queryRaw.mockResolvedValue([]);
    tx.transaction.create.mockResolvedValue(
      txRow("tx-1", {
        type: "EXPENSE",
        accountId: "acc-1",
        categoryId: "cat-1",
        entries: [
          {
            id: "e1",
            financialAccountId: null,
            categoryId: "cat-1",
            direction: "DEBIT",
            amountMinor: 500,
          },
          {
            id: "e2",
            financialAccountId: "acc-1",
            categoryId: null,
            direction: "CREDIT",
            amountMinor: 500,
          },
        ],
      }),
    );

    const result = await service.createExpense("tenant-1", "user-1", {
      accountId: "acc-1",
      categoryId: "cat-1",
      amountMinor: 500,
    });

    expect(result.entries[0]?.direction).toBe("DEBIT");
    expect(result.entries[1]?.direction).toBe("CREDIT");
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "EXPENSE_CREATED" }),
      }),
    );
  });

  it("rejects an expense with an unknown account", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(null);

    await expect(
      service.createExpense("tenant-1", "user-1", {
        accountId: "missing",
        categoryId: "cat-1",
        amountMinor: 500,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects a movement on an inactive account", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(
      account("acc-1", { isActive: false }),
    );

    await expect(
      service.createExpense("tenant-1", "user-1", {
        accountId: "acc-1",
        categoryId: "cat-1",
        amountMinor: 500,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an income whose category type is EXPENSE", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(account("acc-1"));
    tx.category.findFirst.mockResolvedValue(category("cat-1", "EXPENSE"));

    await expect(
      service.createIncome("tenant-1", "user-1", {
        accountId: "acc-1",
        categoryId: "cat-1",
        amountMinor: 500,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a transaction for a disabled service", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(account("acc-1"));
    tx.category.findFirst.mockResolvedValue(category("cat-1", "INCOME"));
    tx.serviceSubscription.findFirst.mockResolvedValue(null);

    await expect(
      service.createIncome("tenant-1", "user-1", {
        accountId: "acc-1",
        categoryId: "cat-1",
        amountMinor: 500,
        serviceKey: "VEHICLE",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a transfer between different ledgers", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValueOnce(
      account("from-1", { ledgerId: "ledger-1" }),
    );
    tx.financialAccount.findFirst.mockResolvedValueOnce(
      account("to-1", { ledgerId: "ledger-2" }),
    );

    await expect(
      service.createTransfer("tenant-1", "user-1", {
        fromAccountId: "from-1",
        toAccountId: "to-1",
        amountMinor: 2000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a transfer to the same account", async () => {
    const { service } = createContext();

    await expect(
      service.createTransfer("tenant-1", "user-1", {
        fromAccountId: "acc-1",
        toAccountId: "acc-1",
        amountMinor: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an expense that would overdraw a bank account", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(account("acc-1"));
    tx.category.findFirst.mockResolvedValue(category("cat-1", "EXPENSE"));
    tx.serviceSubscription.findFirst.mockResolvedValue(null);
    tx.transaction.findUnique.mockResolvedValue(null);
    tx.transactionEntry.groupBy.mockResolvedValue([]);
    tx.$queryRaw.mockResolvedValue([]);

    await expect(
      service.createExpense("tenant-1", "user-1", {
        accountId: "acc-1",
        categoryId: "cat-1",
        amountMinor: 500,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows a credit card account to carry a negative balance", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(
      account("cc-1", { type: "CREDIT_CARD" }),
    );
    tx.category.findFirst.mockResolvedValue(category("cat-1", "EXPENSE"));
    tx.serviceSubscription.findFirst.mockResolvedValue(null);
    tx.transaction.findUnique.mockResolvedValue(null);
    tx.transactionEntry.groupBy.mockResolvedValue([]);
    tx.$queryRaw.mockResolvedValue([]);
    tx.transaction.create.mockResolvedValue(
      txRow("tx-1", {
        type: "EXPENSE",
        accountId: "cc-1",
        categoryId: "cat-1",
        entries: [],
      }),
    );

    const result = await service.createExpense("tenant-1", "user-1", {
      accountId: "cc-1",
      categoryId: "cat-1",
      amountMinor: 5000,
    });

    expect(result.type).toBe("EXPENSE");
  });

  it("replays an idempotent request without creating a duplicate", async () => {
    const { tx, service } = createContext();
    const input = {
      accountId: "acc-1",
      categoryId: "cat-1",
      amountMinor: 1000,
    };
    tx.transaction.findUnique.mockResolvedValue(
      txRow("tx-1", { idempotencyHash: hashPayload(input) }),
    );

    const result = await service.createIncome(
      "tenant-1",
      "user-1",
      input,
      "key-1",
    );

    expect(result.id).toBe("tx-1");
    expect(tx.transaction.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("conflicts when an idempotency key is reused with a different request", async () => {
    const { tx, service } = createContext();
    tx.transaction.findUnique.mockResolvedValue(
      txRow("tx-1", { idempotencyHash: "different-hash" }),
    );

    await expect(
      service.createIncome(
        "tenant-1",
        "user-1",
        { accountId: "acc-1", categoryId: "cat-1", amountMinor: 1000 },
        "key-1",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("reverses a transaction and marks the original as reversed", async () => {
    const { tx, service } = createContext();
    tx.transaction.findFirst.mockResolvedValue(
      txRow("tx-1", {
        accountId: "acc-1",
        entries: [
          {
            id: "e1",
            financialAccountId: "acc-1",
            categoryId: null,
            direction: "DEBIT",
            amountMinor: 1000,
          },
          {
            id: "e2",
            financialAccountId: null,
            categoryId: "cat-1",
            direction: "CREDIT",
            amountMinor: 1000,
          },
        ],
      }),
    );
    tx.financialAccount.findMany.mockResolvedValue([account("acc-1")]);
    tx.transactionEntry.groupBy.mockResolvedValue([
      {
        financialAccountId: "acc-1",
        direction: "DEBIT",
        _sum: { amountMinor: 1000 },
      },
    ]);
    tx.$queryRaw.mockResolvedValue([]);
    tx.transaction.create.mockResolvedValue(
      txRow("tx-2", { reversesId: "tx-1", entries: [] }),
    );
    tx.transaction.update.mockResolvedValue({});

    const result = await service.reverse("tenant-1", "user-1", "tx-1");

    expect(result.reversesId).toBe("tx-1");
    expect(tx.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reversesId: "tx-1",
          entries: {
            create: expect.arrayContaining([
              expect.objectContaining({ direction: "CREDIT" }),
              expect.objectContaining({ direction: "DEBIT" }),
            ]),
          },
        }),
      }),
    );
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { id: "tx-1" },
      data: expect.objectContaining({ reversedById: "tx-2" }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "TRANSACTION_REVERSED" }),
      }),
    );
  });

  it("rejects reversing an already reversed transaction", async () => {
    const { tx, service } = createContext();
    tx.transaction.findFirst.mockResolvedValue(
      txRow("tx-1", { reversedById: "tx-0" }),
    );

    await expect(
      service.reverse("tenant-1", "user-1", "tx-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("computes a ledger balance from entry deltas and opening balances", async () => {
    const { repo, ledgers, prisma, service } = createContext();
    ledgers.personalLedger.mockResolvedValue({ id: "ledger-1" });
    prisma.client.ledger.findFirst.mockResolvedValue({
      id: "ledger-1",
      accounts: [
        { id: "acc-1", name: "Cash", openingBalanceMinor: 1000 },
        { id: "acc-2", name: "Savings", openingBalanceMinor: 5000 },
      ],
    });
    repo.entryBalanceDelta.mockResolvedValue(
      new Map([
        ["acc-1", 2000],
        ["acc-2", 3000],
      ]),
    );

    const result = await service.balance("tenant-1");

    expect(result.totalMinor).toBe(11000);
    expect(result.accounts[0]).toEqual({
      id: "acc-1",
      name: "Cash",
      balanceMinor: 3000,
    });
    expect(result.accounts[1]).toEqual({
      id: "acc-2",
      name: "Savings",
      balanceMinor: 8000,
    });
  });

  it("rejects a capability without a service", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(account("acc-1"));
    tx.category.findFirst.mockResolvedValue(category("cat-1", "INCOME"));

    await expect(
      service.createIncome("tenant-1", "user-1", {
        accountId: "acc-1",
        categoryId: "cat-1",
        amountMinor: 1000,
        capabilityKey: "expenses",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a capability that does not belong to the service", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(account("acc-1"));
    tx.category.findFirst.mockResolvedValue(category("cat-1", "INCOME"));
    tx.serviceDefinition.findUnique.mockResolvedValue({
      key: "HOME",
      capabilities: [{ id: "cap-1", key: "expenses", required: false }],
    });

    await expect(
      service.createIncome("tenant-1", "user-1", {
        accountId: "acc-1",
        categoryId: "cat-1",
        amountMinor: 1000,
        serviceKey: "HOME",
        capabilityKey: "vehicles",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a capability that is not active for the service", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(account("acc-1"));
    tx.category.findFirst.mockResolvedValue(category("cat-1", "INCOME"));
    tx.serviceDefinition.findUnique.mockResolvedValue({
      key: "HOME",
      capabilities: [{ id: "cap-1", key: "expenses", required: false }],
    });
    tx.serviceSubscription.findFirst.mockResolvedValue({
      id: "sub-1",
      selections: [],
    });

    await expect(
      service.createIncome("tenant-1", "user-1", {
        accountId: "acc-1",
        categoryId: "cat-1",
        amountMinor: 1000,
        serviceKey: "HOME",
        capabilityKey: "expenses",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("persists an active capability on an income", async () => {
    const { tx, service } = createContext();
    tx.financialAccount.findFirst.mockResolvedValue(account("acc-1"));
    tx.category.findFirst.mockResolvedValue(category("cat-1", "INCOME"));
    tx.serviceDefinition.findUnique.mockResolvedValue({
      key: "HOME",
      capabilities: [{ id: "cap-1", key: "expenses", required: false }],
    });
    tx.serviceSubscription.findFirst.mockResolvedValue({
      id: "sub-1",
      selections: [{ capabilityId: "cap-1", enabled: true }],
    });
    tx.transaction.findUnique.mockResolvedValue(null);
    tx.transactionEntry.groupBy.mockResolvedValue([]);
    tx.$queryRaw.mockResolvedValue([]);
    tx.transaction.create.mockResolvedValue(
      txRow("tx-1", {
        accountId: "acc-1",
        categoryId: "cat-1",
        serviceKey: "HOME",
        capabilityKey: "expenses",
      }),
    );

    const result = await service.createIncome("tenant-1", "user-1", {
      accountId: "acc-1",
      categoryId: "cat-1",
      amountMinor: 1000,
      serviceKey: "HOME",
      capabilityKey: "expenses",
    });

    expect(result.capabilityKey).toBe("expenses");
    expect(tx.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          serviceKey: "HOME",
          capabilityKey: "expenses",
        }),
      }),
    );
  });
});
