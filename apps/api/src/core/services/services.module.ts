import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { SessionAuthGuard } from "../tenant/session-auth.guard.js";
import { AdminOnlyGuard } from "./admin-only.guard.js";
import { ServiceAccessGuard } from "./service-access.guard.js";
import { ServicesController } from "./services.controller.js";
import { ServicesService } from "./services.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ServicesController],
  providers: [ServicesService, SessionAuthGuard, AdminOnlyGuard, ServiceAccessGuard],
  exports: [ServicesService, ServiceAccessGuard],
})
export class ServicesModule {}