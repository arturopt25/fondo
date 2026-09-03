import { Global, Module } from "@nestjs/common";

import { PrismaModule } from "../prisma.module.js";
import {
  createBetterAuth,
  type BetterAuthInstance,
} from "./better-auth.config.js";
import { TenantProvisioningService } from "./tenant-provisioning.service.js";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: "BETTER_AUTH",
      useFactory: (
        provisioning: TenantProvisioningService,
      ): BetterAuthInstance => {
        return createBetterAuth(provisioning);
      },
      inject: [TenantProvisioningService],
    },
    TenantProvisioningService,
  ],
  exports: ["BETTER_AUTH"],
})
export class AuthModule {}
