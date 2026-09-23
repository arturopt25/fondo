import { Injectable } from "@nestjs/common";
import type { Prisma } from "@fondo/db";

import { prisma } from "@fondo/db";

@Injectable()
export class PrismaService {
  readonly client = prisma;

  withTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(callback);
  }
}
