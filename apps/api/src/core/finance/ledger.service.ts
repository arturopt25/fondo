import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma.service.js";

@Injectable()
export class LedgerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async personalLedger(
    tenantId: string,
    userId: string,
  ): Promise<{ id: string }> {
    return this.prisma.withTenantContext({ tenantId, userId }, async (tx) => {
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
    });
  }
}
