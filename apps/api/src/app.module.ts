import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

import { HealthModule } from "./core/health/health.module.js";
import { AuthModule } from "./core/auth/auth.module.js";
import { MeModule } from "./core/me/me.module.js";
import { PrismaModule } from "./core/prisma.module.js";
import { ServicesModule } from "./core/services/services.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    MeModule,
    HealthModule,
    ServicesModule,
  ],
})
export class AppModule {}
