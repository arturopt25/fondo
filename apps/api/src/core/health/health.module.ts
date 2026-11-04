import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { AppLoggerModule } from "../logger/logger.module.js";
import { PrismaModule } from "../prisma.module.js";
import { DatabaseHealthIndicator } from "./database-health.indicator.js";
import { HealthController } from "./health.controller.js";

@Module({
  imports: [TerminusModule, PrismaModule, AppLoggerModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator],
})
export class HealthModule {}
