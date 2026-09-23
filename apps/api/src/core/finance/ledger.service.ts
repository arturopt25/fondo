import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma.service.js";

@Injectable()
export class LedgerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async personalLedger(tenantId: string): Promise<{ id: string }> {
    const existing = await this.prisma.client.ledger.findFirst({
      where: { tenantId, scope: "PERSONAL" },
    });

    if (existing) {
      return { id: existing.id };
    }

    const created = await this.prisma.client.ledger.create({
      data: { tenantId, name: "Personal", scope: "PERSONAL" },
    });

    return { id: created.id };
  }
}
