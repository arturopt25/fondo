import { Global, Module } from "@nestjs/common";

import { PrismaModule } from "../prisma.module.js";
import { parseWebOrigins } from "../config/app-config.js";
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
        return createBetterAuth({
          provisioner: provisioning,
          webOrigins: parseWebOrigins(
            process.env.WEB_ORIGIN ?? "http://localhost:5173",
          ),
        });
      },
      inject: [TenantProvisioningService],
    },
    TenantProvisioningService,
  ],
  exports: ["BETTER_AUTH"],
})
export class AuthModule {}
