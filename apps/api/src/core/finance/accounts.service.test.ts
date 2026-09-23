import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountsService } from "./accounts.service.js";

function createMocks() {
  const repo = {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };
  const ledgers = { personalLedger: vi.fn() };
  const auditLogCreate = vi.fn();
  const prisma = { client: { auditLog: { create: auditLogCreate } } };
  const service = new AccountsService(
    repo as never,
    ledgers as never,
    prisma as never,
  );
  return { repo, ledgers, auditLogCreate, service };
}

describe("AccountsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists accounts for a tenant", async () => {
    const { repo, service } = createMocks();
    repo.list.mockResolvedValue({
      items: [
        {
          id: "a1",
          name: "Savings",
          type: "BANK",
          currency: "USD",
          openingBalanceMinor: 100,
          isActive: true,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      total: 1,
    });

    const result = await service.list("tenant-1", {
      page: 1,
      pageSize: 20,
    });

    expect(result.items[0]?.name).toBe("Savings");
    expect(result.items[0]?.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(repo.list).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ orderBy: { createdAt: "asc" } }),
    );
  });

  it("creates an account and writes an audit log", async () => {
    const { repo, ledgers, auditLogCreate, service } = createMocks();
    ledgers.personalLedger.mockResolvedValue({ id: "ledger-1" });
    repo.create.mockResolvedValue({
      id: "a1",
      name: "Cash",
      type: "CASH",
      currency: "USD",
      openingBalanceMinor: 0,
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await service.create("tenant-1", "user-1", {
      name: "Cash",
      type: "CASH",
      currency: "USD",
      openingBalanceMinor: 0,
    });

    expect(repo.create).toHaveBeenCalledWith("tenant-1", "ledger-1", {
      name: "Cash",
      type: "CASH",
      currency: "USD",
      openingBalanceMinor: 0,
    });
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        actorId: "user-1",
        action: "ACCOUNT_CREATED",
        resource: "account:a1",
        metadata: { resource: "a1" },
      },
    });
  });

  it("throws 404 when updating an unknown account", async () => {
    const { repo, service } = createMocks();
    repo.findById.mockResolvedValue(null);

    await expect(
      service.update("tenant-1", "user-1", "missing", { name: "New" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws 404 when archiving an account from another tenant", async () => {
    const { repo, service } = createMocks();
    repo.archive.mockResolvedValue({ count: 0 });

    await expect(
      service.archive("tenant-1", "user-1", "a1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
