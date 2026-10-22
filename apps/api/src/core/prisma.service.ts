import { Injectable } from "@nestjs/common";
import type { Prisma } from "@fondo/db";

import { prisma } from "@fondo/db";

export interface TenantContext {
  readonly tenantId: string;
  readonly userId: string;
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
