import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@fondo/db";
import { createHash } from "node:crypto";

import type {
  AccountType,
  CategoryType,
  CreateExpenseInput,
  CreateIncomeInput,
  CreateTransferInput,
  EntryDirection,
  LedgerBalanceResponse,
  ServiceKey,
  Transaction,
  TransactionListResponse,
} from "@fondo/shared-types";
import type { $Enums, PrismaClient } from "@fondo/db";

import { PrismaService } from "../prisma.service.js";
import { LedgerService } from "./ledger.service.js";
import { TransactionsRepository } from "./repositories/transactions.repository.js";

const MOVEMENT_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
type MovementType = (typeof MOVEMENT_TYPES)[number];

function isMovementType(value: string | undefined): value is MovementType {
  return (
    value !== undefined && (MOVEMENT_TYPES as readonly string[]).includes(value)
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

interface EntryInput {
  readonly financialAccountId?: string | null;
  readonly categoryId?: string | null;
  readonly direction: $Enums.EntryDirection;
  readonly amountMinor: number;
}

interface AccountForBalance {
  readonly id: string;
  readonly type: AccountType;
  readonly openingBalanceMinor: number;
}

interface CommitParams {
  readonly type: $Enums.TransactionType;
  readonly amountMinor: number;
  readonly ledgerId: string;
  readonly accountId?: string;
  readonly categoryId?: string;
  readonly transferFromId?: string;
  readonly transferToId?: string;
  readonly serviceKey?: ServiceKey | null;
  readonly capabilityKey?: string | null;
  readonly sourceType?: string | null;
  readonly sourceId?: string | null;
  readonly note?: string | null;
  readonly occurredAt: Date;
  readonly entries: readonly EntryInput[];
  readonly accountsForBalance: readonly AccountForBalance[];
  readonly netChange: ReadonlyMap<string, number>;
  readonly idempotencyKey?: string | undefined;
  readonly idempotencyHash?: string | undefined;
  readonly reversesId?: string | undefined;
  readonly auditAction: string;
}

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(TransactionsRepository)
    private readonly transactions: TransactionsRepository,
    @Inject(LedgerService) private readonly ledgers: LedgerService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async list(
    tenantId: string,
    query: { ledgerId?: string; type?: string; page: number; pageSize: number },
  ): Promise<TransactionListResponse> {
    const ledgerId =
      query.ledgerId ?? (await this.ledgers.personalLedger(tenantId)).id;

    const rawType = query.type;
    const type = isMovementType(rawType) ? rawType : undefined;

    const { items, total } = await this.transactions.list(tenantId, {
      ...(ledgerId ? { ledgerId } : {}),
      ...(type !== undefined ? { type } : {}),
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      items: items.map(toTransaction),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listRecent(
    tenantId: string,
    ledgerId: string,
    limit: number,
  ): Promise<Transaction[]> {
    const { items } = await this.transactions.list(tenantId, {
      ledgerId,
      page: 1,
      pageSize: limit,
    });
    return items.map(toTransaction);
  }

  async createIncome(
    tenantId: string,
    actorId: string,
    input: CreateIncomeInput,
    idempotencyKey?: string,
  ): Promise<Transaction> {
    const payloadHash = hashPayload(input);

    return this.runCommit(tenantId, idempotencyKey, payloadHash, async (tx) => {
      const replay = await this.replayOrNull(
        tx,
        tenantId,
        idempotencyKey,
        payloadHash,
      );
      if (replay) {
        return replay;
      }

      const account = await this.requireActiveAccount(
        tx,
        tenantId,
        input.accountId,
      );
      const category = await this.requireCategory(
        tx,
        tenantId,
        input.categoryId,
        "INCOME",
      );
      await this.requireActiveService(tx, tenantId, input.serviceKey);
      await this.requireActiveServiceCapability(
        tx,
        tenantId,
        input.serviceKey,
        input.capabilityKey,
      );

      const entries: readonly EntryInput[] = [
        {
          financialAccountId: account.id,
          direction: "DEBIT",
          amountMinor: input.amountMinor,
        },
        {
          categoryId: category.id,
          direction: "CREDIT",
          amountMinor: input.amountMinor,
        },
      ];

      return this.commit(tx, tenantId, actorId, {
        type: "INCOME",
        amountMinor: input.amountMinor,
        ledgerId: account.ledgerId,
        accountId: account.id,
        categoryId: category.id,
        serviceKey: input.serviceKey ?? null,
        capabilityKey: input.capabilityKey ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        note: input.note ?? null,
        occurredAt: parseDate(input.occurredAt),
        entries,
        accountsForBalance: [account],
        netChange: netChangeOf(entries),
        idempotencyKey,
        idempotencyHash: payloadHash,
        auditAction: "INCOME_CREATED",
      });
    });
  }

  async createExpense(
    tenantId: string,
    actorId: string,
    input: CreateExpenseInput,
    idempotencyKey?: string,
  ): Promise<Transaction> {
    const payloadHash = hashPayload(input);

    return this.runCommit(tenantId, idempotencyKey, payloadHash, async (tx) => {
      const replay = await this.replayOrNull(
        tx,
        tenantId,
        idempotencyKey,
        payloadHash,
      );
      if (replay) {
        return replay;
      }

      const account = await this.requireActiveAccount(
        tx,
        tenantId,
        input.accountId,
      );
      const category = await this.requireCategory(
        tx,
        tenantId,
        input.categoryId,
        "EXPENSE",
      );
      await this.requireActiveService(tx, tenantId, input.serviceKey);
      await this.requireActiveServiceCapability(
        tx,
        tenantId,
        input.serviceKey,
        input.capabilityKey,
      );

      const entries: readonly EntryInput[] = [
        {
          categoryId: category.id,
          direction: "DEBIT",
          amountMinor: input.amountMinor,
        },
        {
          financialAccountId: account.id,
          direction: "CREDIT",
          amountMinor: input.amountMinor,
        },
      ];

      return this.commit(tx, tenantId, actorId, {
        type: "EXPENSE",
        amountMinor: input.amountMinor,
        ledgerId: account.ledgerId,
        accountId: account.id,
        categoryId: category.id,
        serviceKey: input.serviceKey ?? null,
        capabilityKey: input.capabilityKey ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        note: input.note ?? null,
        occurredAt: parseDate(input.occurredAt),
        entries,
        accountsForBalance: [account],
        netChange: netChangeOf(entries),
        idempotencyKey,
        idempotencyHash: payloadHash,
        auditAction: "EXPENSE_CREATED",
      });
    });
  }

  async createTransfer(
    tenantId: string,
    actorId: string,
    input: CreateTransferInput,
    idempotencyKey?: string,
  ): Promise<Transaction> {
    if (input.fromAccountId === input.toAccountId) {
      throw new BadRequestException("Transfer accounts must differ");
    }

    const payloadHash = hashPayload(input);

    return this.runCommit(tenantId, idempotencyKey, payloadHash, async (tx) => {
      const replay = await this.replayOrNull(
        tx,
        tenantId,
        idempotencyKey,
        payloadHash,
      );
      if (replay) {
        return replay;
      }

      const from = await this.requireActiveAccount(
        tx,
        tenantId,
        input.fromAccountId,
      );
      const to = await this.requireActiveAccount(
        tx,
        tenantId,
        input.toAccountId,
      );

      if (from.ledgerId !== to.ledgerId) {
        throw new BadRequestException(
          "Transfers across ledgers are not supported yet",
        );
      }

      const entries: readonly EntryInput[] = [
        {
          financialAccountId: to.id,
          direction: "DEBIT",
          amountMinor: input.amountMinor,
        },
        {
          financialAccountId: from.id,
          direction: "CREDIT",
          amountMinor: input.amountMinor,
        },
      ];

      return this.commit(tx, tenantId, actorId, {
        type: "TRANSFER",
        amountMinor: input.amountMinor,
        ledgerId: from.ledgerId,
        transferFromId: from.id,
        transferToId: to.id,
        note: input.note ?? null,
        occurredAt: parseDate(input.occurredAt),
        entries,
        accountsForBalance: [from, to],
        netChange: netChangeOf(entries),
        idempotencyKey,
        idempotencyHash: payloadHash,
        auditAction: "TRANSFER_CREATED",
      });
    });
  }

  async reverse(
    tenantId: string,
    actorId: string,
    id: string,
    note?: string,
  ): Promise<Transaction> {
    return this.prisma.withTransaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { tenantId, id },
        include: { entries: true },
      });

      if (!existing) {
        throw new NotFoundException("Transaction not found");
      }
      if (existing.reversedById) {
        throw new BadRequestException("Transaction has already been reversed");
      }

      const accountIds = existing.entries
        .map((entry) => entry.financialAccountId)
        .filter((value): value is string => value !== null);

      const accounts =
        accountIds.length > 0
          ? await tx.financialAccount.findMany({
              where: { tenantId, id: { in: accountIds } },
              select: { id: true, type: true, openingBalanceMinor: true },
            })
          : [];

      const entries: EntryInput[] = existing.entries.map((entry) => ({
        financialAccountId: entry.financialAccountId,
        categoryId: entry.categoryId,
        direction: entry.direction === "DEBIT" ? "CREDIT" : "DEBIT",
        amountMinor: entry.amountMinor,
      }));

      const reversal = await this.commit(tx, tenantId, actorId, {
        type: existing.type as $Enums.TransactionType,
        amountMinor: existing.amountMinor,
        ledgerId: existing.ledgerId,
        note: note ?? `Reversal of ${existing.id}`,
        occurredAt: new Date(),
        entries,
        accountsForBalance: accounts,
        netChange: netChangeOf(entries),
        reversesId: existing.id,
        auditAction: "TRANSACTION_REVERSED",
      });

      await tx.transaction.update({
        where: { id: existing.id },
        data: { reversedById: reversal.id, updatedById: actorId },
      });

      return reversal;
    });
  }

  async balance(
    tenantId: string,
    ledgerId?: string,
  ): Promise<LedgerBalanceResponse> {
    const targetLedgerId =
      ledgerId ?? (await this.ledgers.personalLedger(tenantId)).id;

    const ledger = await this.prisma.client.ledger.findFirst({
      where: { tenantId, id: targetLedgerId },
      include: {
        accounts: { where: { isActive: true }, orderBy: { name: "asc" } },
      },
    });

    if (!ledger) {
      throw new NotFoundException("Ledger not found");
    }

    const accountIds = ledger.accounts.map((account) => account.id);
    const deltas = await this.transactions.entryBalanceDelta(
      tenantId,
      accountIds,
    );

    const accounts = ledger.accounts.map((account) => {
      const balanceMinor =
        account.openingBalanceMinor + (deltas.get(account.id) ?? 0);
      return {
        id: account.id,
        name: account.name,
        balanceMinor,
      };
    });

    return {
      ledgerId: ledger.id,
      totalMinor: accounts.reduce(
        (sum, account) => sum + account.balanceMinor,
        0,
      ),
      accounts,
    };
  }

  private async requireActiveAccount(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<AccountForBalance & { readonly ledgerId: string }> {
    const account = await tx.financialAccount.findFirst({
      where: { tenantId, id },
    });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    if (!account.isActive) {
      throw new BadRequestException("Account is inactive");
    }
    return {
      id: account.id,
      ledgerId: account.ledgerId,
      type: account.type as AccountType,
      openingBalanceMinor: account.openingBalanceMinor,
    };
  }

  private async requireCategory(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
    expectedType: CategoryType,
  ): Promise<{ readonly id: string }> {
    const category = await tx.category.findFirst({
      where: { tenantId, id },
    });
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    if (!category.isActive) {
      throw new BadRequestException("Category is inactive");
    }
    if (category.type !== expectedType) {
      throw new BadRequestException(`Category type must be ${expectedType}`);
    }
    return { id: category.id };
  }

  private async requireActiveService(
    tx: Prisma.TransactionClient,
    tenantId: string,
    serviceKey?: ServiceKey | null,
  ): Promise<void> {
    if (!serviceKey) {
      return;
    }
    const subscription = await tx.serviceSubscription.findFirst({
      where: { tenantId, status: "ACTIVE", service: { key: serviceKey } },
    });
    if (!subscription) {
      throw new BadRequestException(
        `Service ${serviceKey} is not active for this tenant`,
      );
    }
  }

  private async requireActiveServiceCapability(
    tx: Prisma.TransactionClient,
    tenantId: string,
    serviceKey: ServiceKey | undefined,
    capabilityKey: string | undefined,
  ): Promise<void> {
    if (!capabilityKey) {
      return;
    }
    if (!serviceKey) {
      throw new BadRequestException(
        "A capability requires a service to be selected",
      );
    }
    const definition = await tx.serviceDefinition.findUnique({
      where: { key: serviceKey },
      include: { capabilities: true },
    });
    const capability = definition?.capabilities.find(
      (item) => item.key === capabilityKey,
    );
    if (!capability) {
      throw new BadRequestException(
        `Capability ${capabilityKey} does not belong to service ${serviceKey}`,
      );
    }
    const subscription = await tx.serviceSubscription.findFirst({
      where: { tenantId, status: "ACTIVE", service: { key: serviceKey } },
      include: { selections: true },
    });
    const active =
      capability.required ||
      (subscription?.selections.some(
        (selection) =>
          selection.enabled && selection.capabilityId === capability.id,
      ) ?? false);
    if (!active) {
      throw new BadRequestException(
        `Capability ${capabilityKey} is not active for service ${serviceKey}`,
      );
    }
  }

  private async runCommit<T>(
    tenantId: string,
    idempotencyKey: string | undefined,
    payloadHash: string,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.withTransaction(callback);
    } catch (error) {
      if (idempotencyKey && isUniqueViolation(error)) {
        const replay = await this.replayOrNull(
          this.prisma.client,
          tenantId,
          idempotencyKey,
          payloadHash,
        );
        if (replay) {
          return replay as T;
        }
      }
      throw error;
    }
  }

  private async replayOrNull(
    client: Prisma.TransactionClient | PrismaClient,
    tenantId: string,
    idempotencyKey: string | undefined,
    payloadHash: string | undefined,
  ): Promise<Transaction | null> {
    if (!idempotencyKey) {
      return null;
    }

    const existing = await client.transaction.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      include: { entries: true },
    });
    if (!existing) {
      return null;
    }
    if (existing.idempotencyHash !== payloadHash) {
      throw new ConflictException(
        "Idempotency key was already used with a different request",
      );
    }
    return toTransaction(existing);
  }

  private async commit(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorId: string,
    params: CommitParams,
  ): Promise<Transaction> {
    const debits = params.entries
      .filter((entry) => entry.direction === "DEBIT")
      .reduce((sum, entry) => sum + entry.amountMinor, 0);
    const credits = params.entries
      .filter((entry) => entry.direction === "CREDIT")
      .reduce((sum, entry) => sum + entry.amountMinor, 0);

    if (debits !== credits) {
      throw new BadRequestException("Transaction entries must balance");
    }

    await this.assertAccountBalances(
      tx,
      tenantId,
      params.accountsForBalance,
      params.netChange,
    );

    const replay = await this.replayOrNull(
      tx,
      tenantId,
      params.idempotencyKey,
      params.idempotencyHash,
    );
    if (replay) {
      return replay;
    }

    const transaction = await tx.transaction.create({
      data: {
        tenantId,
        ledgerId: params.ledgerId,
        type: params.type,
        amountMinor: params.amountMinor,
        categoryId: params.categoryId ?? null,
        accountId: params.accountId ?? null,
        transferFromId: params.transferFromId ?? null,
        transferToId: params.transferToId ?? null,
        serviceKey: params.serviceKey ?? null,
        capabilityKey: params.capabilityKey ?? null,
        sourceType: params.sourceType ?? null,
        sourceId: params.sourceId ?? null,
        note: params.note ?? null,
        occurredAt: params.occurredAt,
        createdById: actorId,
        reversesId: params.reversesId ?? null,
        idempotencyKey: params.idempotencyKey ?? null,
        idempotencyHash: params.idempotencyHash ?? null,
        entries: {
          create: params.entries.map((entry) => ({
            financialAccountId: entry.financialAccountId ?? null,
            categoryId: entry.categoryId ?? null,
            direction: entry.direction,
            amountMinor: entry.amountMinor,
          })),
        },
      },
      include: { entries: true },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: params.auditAction,
        resource: `transaction:${transaction.id}`,
        metadata: { resource: transaction.id },
      },
    });

    return toTransaction(transaction);
  }

  private async assertAccountBalances(
    tx: Prisma.TransactionClient,
    tenantId: string,
    accounts: readonly AccountForBalance[],
    netChange: ReadonlyMap<string, number>,
  ): Promise<void> {
    const accountIds = accounts.map((account) => account.id);
    await this.lockAccounts(tx, tenantId, accountIds);
    const deltas = await this.accountBalanceDeltas(tx, tenantId, accountIds);

    for (const account of accounts) {
      if (account.type === "CREDIT_CARD") {
        continue;
      }
      const balance =
        account.openingBalanceMinor +
        (deltas.get(account.id) ?? 0) +
        (netChange.get(account.id) ?? 0);
      if (balance < 0) {
        throw new BadRequestException(
          `Account "${account.id}" would end up with a negative balance`,
        );
      }
    }
  }

  private async lockAccounts(
    tx: Prisma.TransactionClient,
    tenantId: string,
    accountIds: string[],
  ): Promise<void> {
    const sorted = [...new Set(accountIds)].sort();
    if (sorted.length === 0) {
      return;
    }
    await tx.$queryRaw`SELECT "id" FROM "FinancialAccount" WHERE "id"::text IN (${Prisma.join(sorted)}) AND "tenantId"::text = ${tenantId} FOR UPDATE`;
  }

  private async accountBalanceDeltas(
    tx: Prisma.TransactionClient,
    tenantId: string,
    accountIds: string[],
  ): Promise<Map<string, number>> {
    if (accountIds.length === 0) {
      return new Map();
    }

    const rows = await tx.transactionEntry.groupBy({
      by: ["financialAccountId", "direction"],
      where: {
        financialAccountId: { in: accountIds },
        transaction: { tenantId },
      },
      _sum: { amountMinor: true },
    });

    const deltas = new Map<string, number>();
    for (const row of rows) {
      const accountId = row.financialAccountId;
      if (!accountId) {
        continue;
      }
      const amount = row._sum?.amountMinor ?? 0;
      const delta = row.direction === "DEBIT" ? amount : -amount;
      deltas.set(accountId, (deltas.get(accountId) ?? 0) + delta);
    }

    return deltas;
  }
}

function parseDate(value: string | undefined): Date {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException("Invalid occurredAt date");
  }
  return parsed;
}

function netChangeOf(entries: readonly EntryInput[]): Map<string, number> {
  const net = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.financialAccountId) {
      continue;
    }
    const delta =
      entry.direction === "DEBIT" ? entry.amountMinor : -entry.amountMinor;
    net.set(
      entry.financialAccountId,
      (net.get(entry.financialAccountId) ?? 0) + delta,
    );
  }
  return net;
}

function hashPayload(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function toTransaction(transaction: {
  id: string;
  type: string;
  amountMinor: number;
  categoryId: string | null;
  accountId: string | null;
  transferFromId: string | null;
  transferToId: string | null;
  serviceKey: string | null;
  capabilityKey: string | null;
  sourceType: string | null;
  sourceId: string | null;
  note: string | null;
  occurredAt: Date;
  createdAt: Date;
  reversesId: string | null;
  reversedById: string | null;
  entries?: readonly {
    id: string;
    financialAccountId: string | null;
    categoryId: string | null;
    direction: string;
    amountMinor: number;
  }[];
}): Transaction {
  return {
    id: transaction.id,
    type: transaction.type as Transaction["type"],
    amountMinor: transaction.amountMinor,
    categoryId: transaction.categoryId,
    accountId: transaction.accountId,
    transferFromId: transaction.transferFromId,
    transferToId: transaction.transferToId,
    serviceKey: transaction.serviceKey as Transaction["serviceKey"],
    capabilityKey: transaction.capabilityKey ?? null,
    sourceType: transaction.sourceType,
    sourceId: transaction.sourceId,
    note: transaction.note,
    occurredAt: transaction.occurredAt.toISOString(),
    createdAt: transaction.createdAt.toISOString(),
    reversesId: transaction.reversesId ?? null,
    reversedById: transaction.reversedById ?? null,
    entries: (transaction.entries ?? []).map((entry) => ({
      id: entry.id,
      direction: entry.direction as EntryDirection,
      amountMinor: entry.amountMinor,
      accountId: entry.financialAccountId,
      categoryId: entry.categoryId,
    })),
  };
}
