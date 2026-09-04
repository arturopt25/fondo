import { Injectable } from "@nestjs/common";

import { prisma } from "@fondo/db";

@Injectable()
export class PrismaService {
  readonly client = prisma;
}
