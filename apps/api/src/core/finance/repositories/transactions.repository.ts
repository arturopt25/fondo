import { Inject, Injectable } from "@nestjs/common";
import type { $Enums, Prisma } from "@fondo/db";

import { PrismaService } from "../../prisma.service.js";

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
        include: { entries: true },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.client.transaction.count({ where }),
    ]);

    return { items, total };
  }

  async entryBalanceDelta(
    tenantId: string,
    accountIds: string[],
  ): Promise<Map<string, number>> {
    if (accountIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.client.transactionEntry.groupBy({
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
