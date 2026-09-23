import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type {
  CreateExpenseInput,
  CreateIncomeInput,
  CreateTransferInput,
  LedgerBalanceResponse,
  Transaction,
  TransactionListResponse,
} from "@fondo/shared-types";

import { PrismaService } from "../prisma.service.js";
import { LedgerService } from "./ledger.service.js";
import { TransactionsRepository } from "./repositories/transactions.repository.js";

const MOVEMENT_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
type MovementType = (typeof MOVEMENT_TYPES)[number];

function isMovementType(value: string | undefined): value is MovementType {
  return value !== undefined && (MOVEMENT_TYPES as readonly string[]).includes(value);
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

  async createIncome(
    tenantId: string,
    actorId: string,
    input: CreateIncomeInput,
  ): Promise<Transaction> {
    const { account, ledgerId, categoryId } = await this.validateMovement(
      tenantId,
      input.accountId,
      input.categoryId,
    );

    const transaction = await this.transactions.create({
      tenantId,
      ledgerId,
      type: "INCOME",
      amountMinor: input.amountMinor,
      accountId: account.id,
      categoryId,
      serviceKey: input.serviceKey ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      note: input.note ?? null,
      occurredAt: parseDate(input.occurredAt),
      createdById: actorId,
    });

    await this.audit(tenantId, actorId, "INCOME_CREATED", transaction.id);

    return toTransaction(transaction);
  }

  async createExpense(
    tenantId: string,
    actorId: string,
    input: CreateExpenseInput,
  ): Promise<Transaction> {
    const { account, ledgerId, categoryId } = await this.validateMovement(
      tenantId,
      input.accountId,
      input.categoryId,
    );

    const transaction = await this.transactions.create({
      tenantId,
      ledgerId,
      type: "EXPENSE",
      amountMinor: input.amountMinor,
      accountId: account.id,
      categoryId,
      serviceKey: input.serviceKey ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      note: input.note ?? null,
      occurredAt: parseDate(input.occurredAt),
      createdById: actorId,
    });

    await this.audit(tenantId, actorId, "EXPENSE_CREATED", transaction.id);

    return toTransaction(transaction);
  }

  async createTransfer(
    tenantId: string,
    actorId: string,
    input: CreateTransferInput,
  ): Promise<Transaction> {
    if (input.fromAccountId === input.toAccountId) {
      throw new BadRequestException("Transfer accounts must differ");
    }

    const from = await this.findAccount(tenantId, input.fromAccountId);
    const to = await this.findAccount(tenantId, input.toAccountId);

    if (!from || !to) {
      throw new NotFoundException("Account not found");
    }
    if (from.ledgerId !== to.ledgerId) {
      throw new BadRequestException(
        "Transfers across ledgers are not supported yet",
      );
    }

    const transaction = await this.transactions.create({
      tenantId,
      ledgerId: from.ledgerId,
      type: "TRANSFER",
      amountMinor: input.amountMinor,
      transferFromId: from.id,
      transferToId: to.id,
      note: input.note ?? null,
      occurredAt: parseDate(input.occurredAt),
      createdById: actorId,
    });

    await this.audit(tenantId, actorId, "TRANSFER_CREATED", transaction.id);

    return toTransaction(transaction);
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

    const flows = await this.transactions.accountFlows(tenantId, ledger.id);

    const accounts = ledger.accounts.map((account) => {
      const balanceMinor =
        account.openingBalanceMinor +
        (flows.income.get(account.id) ?? 0) -
        (flows.expense.get(account.id) ?? 0) +
        (flows.transferIn.get(account.id) ?? 0) -
        (flows.transferOut.get(account.id) ?? 0);
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

  private async validateMovement(
    tenantId: string,
    accountId: string,
    categoryId: string,
  ): Promise<{
    account: { id: string; ledgerId: string };
    ledgerId: string;
    categoryId: string;
  }> {
    const account = await this.findAccount(tenantId, accountId);
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const category = await this.prisma.client.category.findFirst({
      where: { tenantId, id: categoryId, isActive: true },
    });
    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return { account, ledgerId: account.ledgerId, categoryId: category.id };
  }

  private findAccount(tenantId: string, id: string) {
    return this.prisma.client.financialAccount.findFirst({
      where: { tenantId, id },
      select: { id: true, ledgerId: true },
    });
  }

  private async audit(
    tenantId: string,
    actorId: string,
    action: string,
    resource: string,
  ): Promise<void> {
    await this.prisma.client.auditLog.create({
      data: {
        tenantId,
        actorId,
        action,
        resource: `transaction:${resource}`,
        metadata: { resource },
      },
    });
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

function toTransaction(transaction: {
  id: string;
  type: string;
  amountMinor: number;
  categoryId: string | null;
  accountId: string | null;
  transferFromId: string | null;
  transferToId: string | null;
  serviceKey: string | null;
  sourceType: string | null;
  sourceId: string | null;
  note: string | null;
  occurredAt: Date;
  createdAt: Date;
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
    sourceType: transaction.sourceType,
    sourceId: transaction.sourceId,
    note: transaction.note,
    occurredAt: transaction.occurredAt.toISOString(),
    createdAt: transaction.createdAt.toISOString(),
  };
}
