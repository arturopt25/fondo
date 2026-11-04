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

  /**
   * Liveness probe: it must not touch the database. Render uses this path so
   * its health checks do not wake a suspended Neon compute or consume CU-hours.
   */
  @Get("live")
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  @HealthCheck()
  ready() {
    return this.runCheck();
  }

  /**
   * Readiness probe. Kept at the root as an alias for backwards compatibility.
   */
  @Get()
  @HealthCheck()
  check() {
    return this.runCheck();
  }

  private runCheck() {
    const timeoutMs = parseHealthDbTimeoutMs(
      process.env.HEALTH_DB_TIMEOUT_MS,
    );

    return this.health.check([() => this.database.check(timeoutMs)]);
  }
}
