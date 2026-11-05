import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@fondo/db";

import { PrismaService } from "../prisma.service.js";

@Injectable()
export class LedgerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Pass the outer transaction client when the caller is already inside a
   * tenant transaction. Opening a nested `$transaction` would hold a second
   * pooled connection and can exhaust the pool under concurrent requests.
   */
  async personalLedger(
    tenantId: string,
    userId: string,
    client?: Prisma.TransactionClient,
  ): Promise<{ id: string }> {
    const resolve = async (tx: Prisma.TransactionClient) => {
      const existing = await tx.ledger.findFirst({
        where: { tenantId, scope: "PERSONAL" },
      });

      if (existing) {
        return { id: existing.id };
      }

      const created = await tx.ledger.create({
        data: { tenantId, name: "Personal", scope: "PERSONAL" },
      });

      return { id: created.id };
    };

    return client
      ? resolve(client)
      : this.prisma.withTenantContext({ tenantId, userId }, resolve);
  }
}
