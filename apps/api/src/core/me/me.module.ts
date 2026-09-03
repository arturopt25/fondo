import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { SessionAuthGuard } from "../tenant/session-auth.guard.js";
import { MeController } from "./me.controller.js";
import { MeService } from "./me.service.js";

@Module({
  imports: [AuthModule],
  controllers: [MeController],
  providers: [MeService, SessionAuthGuard],
})
export class MeModule {}
