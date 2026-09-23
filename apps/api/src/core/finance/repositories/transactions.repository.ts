import { Inject, Injectable } from "@nestjs/common";
import type { $Enums, Prisma } from "@fondo/db";
import type { ServiceKey } from "@fondo/shared-types";

import { PrismaService } from "../../prisma.service.js";

export interface TransactionCreateData {
  tenantId: string;
  ledgerId: string;
  type: $Enums.TransactionType;
  amountMinor: number;
  categoryId?: string;
  accountId?: string;
  transferFromId?: string;
  transferToId?: string;
  serviceKey?: ServiceKey | null;
  sourceType?: string | null;
  sourceId?: string | null;
  note?: string | null;
  occurredAt: Date;
  createdById?: string;
}

@Injectable()
export class TransactionsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private scope(
    tenantId: string,
    extra: Prisma.TransactionWhereInput = {},
  ): Prisma.TransactionWhereInput {
    return { tenantId, deletedAt: null, ...extra };
  }

  async list(
    tenantId: string,
    options: {
      ledgerId?: string;
      type?: $Enums.TransactionType;
      page: number;
      pageSize: number;
    },
  ) {
    const where = this.scope(tenantId, {
      ...(options.ledgerId !== undefined ? { ledgerId: options.ledgerId } : {}),
      ...(options.type !== undefined ? { type: options.type } : {}),
    });

    const [items, total] = await Promise.all([
      this.prisma.client.transaction.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.client.transaction.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: TransactionCreateData) {
    return this.prisma.client.transaction.create({
      data: {
        tenantId: data.tenantId,
        ledgerId: data.ledgerId,
        type: data.type,
        amountMinor: data.amountMinor,
        categoryId: data.categoryId ?? null,
        accountId: data.accountId ?? null,
        transferFromId: data.transferFromId ?? null,
        transferToId: data.transferToId ?? null,
        serviceKey: data.serviceKey ?? null,
        sourceType: data.sourceType ?? null,
        sourceId: data.sourceId ?? null,
        note: data.note ?? null,
        occurredAt: data.occurredAt,
        createdById: data.createdById ?? null,
      },
    });
  }

  async accountFlows(
    tenantId: string,
    ledgerId: string,
  ): Promise<{
    income: Map<string, number>;
    expense: Map<string, number>;
    transferIn: Map<string, number>;
    transferOut: Map<string, number>;
  }> {
    const [income, expense, transferIn, transferOut] = await Promise.all([
      this.prisma.client.transaction.groupBy({
        by: ["accountId"],
        where: this.scope(tenantId, {
          ledgerId,
          type: "INCOME",
          accountId: { not: null },
        }),
        _sum: { amountMinor: true },
      }),
      this.prisma.client.transaction.groupBy({
        by: ["accountId"],
        where: this.scope(tenantId, {
          ledgerId,
          type: "EXPENSE",
          accountId: { not: null },
        }),
        _sum: { amountMinor: true },
      }),
      this.prisma.client.transaction.groupBy({
        by: ["transferToId"],
        where: this.scope(tenantId, {
          ledgerId,
          type: "TRANSFER",
          transferToId: { not: null },
        }),
        _sum: { amountMinor: true },
      }),
      this.prisma.client.transaction.groupBy({
        by: ["transferFromId"],
        where: this.scope(tenantId, {
          ledgerId,
          type: "TRANSFER",
          transferFromId: { not: null },
        }),
        _sum: { amountMinor: true },
      }),
    ]);

    return {
      income: toMap(income, "accountId"),
      expense: toMap(expense, "accountId"),
      transferIn: toMap(transferIn, "transferToId"),
      transferOut: toMap(transferOut, "transferFromId"),
    };
  }
}

function toMap(
  rows: {
    accountId?: string | null;
    transferToId?: string | null;
    transferFromId?: string | null;
    _sum?: { amountMinor: number | null };
  }[],
  key: "accountId" | "transferToId" | "transferFromId",
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const id = row[key];
    if (id) {
      map.set(id, row._sum?.amountMinor ?? 0);
    }
  }
  return map;
}
