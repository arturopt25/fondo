import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@fondo/db";
import { randomUUID } from "node:crypto";

import { PrismaService } from "../prisma.service.js";
import { buildPersonalTenantSlug } from "../auth/better-auth.config.js";

@Injectable()
export class TenantProvisioningService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async provisionForUser(userId: string, displayName: string): Promise<void> {
    const existingMembership = await this.prisma.withUserContext(
      userId,
      async (tx) =>
        tx.membership.findFirst({
          where: { userId },
        }),
    );

    if (existingMembership) {
      return;
    }

    const fallbackName = displayName.trim().slice(0, 40) || "Personal space";
    const tenantId = randomUUID();
    const slug = buildPersonalTenantSlug(userId, fallbackName);

    try {
      await this.prisma.withTenantContext({ tenantId, userId }, async (tx) => {
        await tx.tenant.create({
          data: {
            id: tenantId,
            name: `${fallbackName}'s space`,
            slug,
            ownerUserId: userId,
          },
        });

        await tx.membership.create({
          data: {
            tenantId,
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
          include: { capabilities: true },
        });

        if (personalFinance) {
          await tx.serviceSubscription.create({
            data: {
              tenantId,
              serviceId: personalFinance.id,
              status: "ACTIVE",
              selections: {
                create: personalFinance.capabilities
                  .filter(
                    (capability) =>
                      capability.required || capability.defaultEnabled,
                  )
                  .map((capability) => ({
                    capabilityId: capability.id,
                    enabled: true,
                  })),
              },
            },
          });
        }

        await tx.category.createMany({
          data: DEFAULT_CATEGORIES.map((category) => ({
            tenantId,
            name: category.name,
            type: category.type,
            isDefault: true,
          })),
        });
      });
    } catch (error) {
      // Another request may have created the tenant concurrently. If so, the
      // membership already exists and it is safe to return.
      if (isDuplicateKeyError(error)) {
        return;
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
