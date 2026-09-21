import { Controller, Get, Inject } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from "@nestjs/terminus";

import { PrismaService } from "../prisma.service.js";

@Controller("health")
export class HealthController {
  constructor(
    @Inject(HealthCheckService)
    private readonly health: HealthCheckService,
    @Inject(PrismaHealthIndicator)
    private readonly database: PrismaHealthIndicator,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.database.pingCheck("database", this.prisma.client),
    ]);
  }
}