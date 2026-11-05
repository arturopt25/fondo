import { Injectable } from "@nestjs/common";
import type { Prisma } from "@fondo/db";

import { prisma } from "@fondo/db";

export interface TenantContext {
  readonly tenantId: string;
  readonly userId: string;
}

export interface ResolvedTenantContext {
  readonly membership: {
    readonly role: "ADMIN" | "MEMBER";
    readonly tenantId: string;
  };
  readonly tenant: {
    readonly id: string;
    readonly name: string;
    readonly accountingCurrency: string;
    readonly timeZone: string;
  };
}

@Injectable()
export class PrismaService {
  readonly client = prisma;

  withTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(callback);
  }

  /**
   * Resolve the authenticated user's membership and tenant in a single
   * transaction. The user id must be set before the Membership policy can see
   * rows, so the set_config and the membership query stay as separate
   * statements. The tenant id is only known after the membership lookup.
   */
  async resolveTenantContext(
    userId: string,
  ): Promise<ResolvedTenantContext | null> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;

      const membership = await tx.membership.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { role: true, tenantId: true },
      });

      if (!membership) {
        return null;
      }

      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${membership.tenantId}, true), set_config('app.user_id', ${userId}, true)`;

      const tenant = await tx.tenant.findUnique({
        where: { id: membership.tenantId },
        select: {
          id: true,
          name: true,
          accountingCurrency: true,
          timeZone: true,
        },
      });

      if (!tenant) {
        return null;
      }

      return { membership, tenant };
    });
  }

  /**
   * Run a callback with the application user id set as a local PostgreSQL
   * configuration parameter. Used by the request guard to resolve the
   * authenticated user's membership before the tenant id is known.
   */
  withUserContext<T>(
    userId: string,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
      return callback(tx);
    });
  }

  /**
   * Run a callback with the tenant id and user id set as local PostgreSQL
   * configuration parameters. RLS policies on tenant-scoped tables will use
   * these values automatically.
   */
  withTenantContext<T>(
    context: TenantContext,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${context.tenantId}, true), set_config('app.user_id', ${context.userId}, true)`;
      return callback(tx);
    });
  }
}
