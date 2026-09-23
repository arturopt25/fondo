import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type {
  AccountListResponse,
  CreateAccountInput,
  FinancialAccount,
  UpdateAccountInput,
} from "@fondo/shared-types";

import { PrismaService } from "../prisma.service.js";
import { LedgerService } from "./ledger.service.js";
import { AccountsRepository } from "./repositories/accounts.repository.js";

const ALLOWED_SORTS = new Set(["name", "createdAt"]);

@Injectable()
export class AccountsService {
  constructor(
    @Inject(AccountsRepository) private readonly accounts: AccountsRepository,
    @Inject(LedgerService) private readonly ledgers: LedgerService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async list(
    tenantId: string,
    query: { page: number; pageSize: number; sort?: string },
  ): Promise<AccountListResponse> {
    const orderBy = ALLOWED_SORTS.has(query.sort ?? "")
      ? { [query.sort as string]: "asc" }
      : { createdAt: "asc" as const };

    const { items, total } = await this.accounts.list(tenantId, {
      page: query.page,
      pageSize: query.pageSize,
      orderBy,
    });

    return {
      items: items.map(toAccount),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async create(
    tenantId: string,
    actorId: string,
    input: CreateAccountInput,
  ): Promise<FinancialAccount> {
    const ledger = await this.ledgers.personalLedger(tenantId);
    const account = await this.accounts.create(tenantId, ledger.id, {
      name: input.name,
      type: input.type,
      currency: input.currency,
      openingBalanceMinor: input.openingBalanceMinor,
    });

    await this.audit(tenantId, actorId, "ACCOUNT_CREATED", account.id);

    return toAccount(account);
  }

  async update(
    tenantId: string,
    actorId: string,
    id: string,
    input: UpdateAccountInput,
  ): Promise<FinancialAccount> {
    const existing = await this.accounts.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundException("Account not found");
    }

    const result = await this.accounts.update(tenantId, id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
    });

    if (result.count === 0) {
      throw new NotFoundException("Account not found");
    }

    await this.audit(tenantId, actorId, "ACCOUNT_UPDATED", id);

    const updated = await this.accounts.findById(tenantId, id);
    return toAccount(updated as NonNullable<typeof updated>);
  }

  async archive(
    tenantId: string,
    actorId: string,
    id: string,
  ): Promise<{ id: string }> {
    const result = await this.accounts.archive(tenantId, id);

    if (result.count === 0) {
      throw new NotFoundException("Account not found");
    }

    await this.audit(tenantId, actorId, "ACCOUNT_ARCHIVED", id);

    return { id };
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
        resource: `account:${resource}`,
        metadata: { resource },
      },
    });
  }
}

function toAccount(account: {
  id: string;
  name: string;
  type: string;
  currency: string;
  openingBalanceMinor: number;
  isActive: boolean;
  createdAt: Date;
}): FinancialAccount {
  return {
    id: account.id,
    name: account.name,
    type: account.type as FinancialAccount["type"],
    currency: account.currency,
    openingBalanceMinor: account.openingBalanceMinor,
    isActive: account.isActive,
    createdAt: account.createdAt.toISOString(),
  };
}
