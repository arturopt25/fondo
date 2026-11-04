import { Controller, Get, Inject } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";

import { DatabaseHealthIndicator } from "./database-health.indicator.js";
import { parseHealthDbTimeoutMs } from "./health.config.js";

@Controller("health")
export class HealthController {
  constructor(
    @Inject(HealthCheckService)
    private readonly health: HealthCheckService,
    @Inject(DatabaseHealthIndicator)
    private readonly database: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const timeoutMs = parseHealthDbTimeoutMs(
      process.env.HEALTH_DB_TIMEOUT_MS,
    );

    return this.health.check([() => this.database.check(timeoutMs)]);
  }
}
