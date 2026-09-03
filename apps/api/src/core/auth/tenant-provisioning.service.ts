import { Injectable } from "@nestjs/common";

// Value import required for NestJS decorator metadata (design:paramtypes).
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PrismaService } from "../prisma.service.js";
import { buildPersonalTenantSlug } from "../auth/better-auth.config.js";

@Injectable()
export class TenantProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  async provisionForUser(userId: string, displayName: string): Promise<void> {
    const existing = await this.prisma.client.tenant.findFirst({
      where: { ownerUserId: userId },
    });

    if (existing) {
      return;
    }

    const fallbackName = displayName.trim().slice(0, 40) || "Personal space";
    const slug = buildPersonalTenantSlug(userId, fallbackName);

    try {
      const tenant = await this.prisma.client.tenant.create({
        data: {
          name: `${fallbackName}'s space`,
          slug,
          ownerUserId: userId,
        },
      });

      await this.prisma.client.$transaction([
        this.prisma.client.membership.create({
          data: {
            tenantId: tenant.id,
            userId,
            role: "ADMIN",
          },
        }),
        this.prisma.client.userSettings.create({
          data: {
            userId,
          },
        }),
      ]);
    } catch {
      return;
    }
  }
}
