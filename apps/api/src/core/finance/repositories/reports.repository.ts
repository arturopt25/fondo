import { Inject, Injectable } from "@nestjs/common";

import type { ServiceKey } from "@fondo/shared-types";

import { PrismaService } from "../../prisma.service.js";

export interface CategoryRow {
  readonly direction: string;
  readonly amountMinor: number;
  readonly occurredAt: Date;
  readonly serviceKey: string | null;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly categoryType: string;
}

@Injectable()
export class ReportsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async categoryRows(
    tenantId: string,
    options: {
      ledgerId: string;
      from: Date;
      to: Date;
      serviceKey?: ServiceKey | undefined;
    },
  ): Promise<CategoryRow[]> {
    const rows = await this.prisma.client.transactionEntry.findMany({
      where: {
        transaction: {
          tenantId,
          ledgerId: options.ledgerId,
          occurredAt: { gte: options.from, lte: options.to },
          deletedAt: null,
          ...(options.serviceKey !== undefined
            ? { serviceKey: options.serviceKey }
            : {}),
        },
        categoryId: { not: null },
      },
      select: {
        direction: true,
        amountMinor: true,
        transaction: {
          select: { occurredAt: true, serviceKey: true },
        },
        category: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return rows.flatMap((row) => {
      if (!row.category) {
        return [];
      }
      return [
        {
          direction: row.direction,
          amountMinor: row.amountMinor,
          occurredAt: row.transaction.occurredAt,
          serviceKey: row.transaction.serviceKey ?? null,
          categoryId: row.category.id,
          categoryName: row.category.name,
          categoryType: row.category.type,
        },
      ];
    });
  }
}
