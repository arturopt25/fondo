import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@fondo/db";

import { PrismaService } from "../prisma.service.js";
import { buildPersonalTenantSlug } from "../auth/better-auth.config.js";

@Injectable()
export class TenantProvisioningService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
      await this.prisma.client.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: `${fallbackName}'s space`,
            slug,
            ownerUserId: userId,
          },
        });

        await tx.membership.create({
          data: {
            tenantId: tenant.id,
            userId,
            role: "ADMIN",
          },
        });

        await tx.userSettings.create({
          data: {
            userId,
          },
        });

        const personalFinance = await tx.serviceDefinition.findUnique({
          where: { key: "PERSONAL_FINANCE" },
        });

        if (personalFinance) {
          await tx.serviceSubscription.create({
            data: {
              tenantId: tenant.id,
              serviceId: personalFinance.id,
              status: "ACTIVE",
            },
          });
        }

        await tx.category.createMany({
          data: DEFAULT_CATEGORIES.map((category) => ({
            tenantId: tenant.id,
            name: category.name,
            type: category.type,
            isDefault: true,
          })),
        });
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const retried = await this.prisma.client.tenant.findFirst({
          where: { ownerUserId: userId },
        });
        if (retried) {
          return;
        }
      }
      throw error;
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

const DEFAULT_CATEGORIES = [
  { name: "Housing", type: "EXPENSE" },
  { name: "Food", type: "EXPENSE" },
  { name: "Transport", type: "EXPENSE" },
  { name: "Leisure", type: "EXPENSE" },
  { name: "Other", type: "EXPENSE" },
  { name: "Income", type: "INCOME" },
] as const;
