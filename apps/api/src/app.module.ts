import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { HealthModule } from "./core/health/health.module.js";
import { AuthModule } from "./core/auth/auth.module.js";
import { FinanceModule } from "./core/finance/finance.module.js";
import { MeModule } from "./core/me/me.module.js";
import { PrismaModule } from "./core/prisma.module.js";
import { ServicesModule } from "./core/services/services.module.js";
import { API_READ_THROTTLE } from "./core/config/rate-limits.js";
import { ApiErrorFilter } from "./core/errors/api-error.filter.js";
import { AppLoggerModule } from "./core/logger/logger.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppLoggerModule,
    ThrottlerModule.forRoot([API_READ_THROTTLE.default]),
    PrismaModule,
    AuthModule,
    MeModule,
    HealthModule,
    ServicesModule,
    FinanceModule,
  ],
  providers: [
    ApiErrorFilter,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
