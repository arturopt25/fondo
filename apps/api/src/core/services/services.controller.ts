import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";

import { serviceKeySchema, type ServiceKey } from "@fondo/shared-types";

import { SessionAuthGuard } from "../tenant/session-auth.guard.js";
import { RequestUser } from "../me/request-user.decorator.js";
import type { CurrentUser } from "../tenant/tenant-context.js";
import { RequestTenant } from "../tenant/request-tenant.decorator.js";
import { AdminOnlyGuard } from "./admin-only.guard.js";
import { ServicesService } from "./services.service.js";

interface TenantParams {
  tenantId: string;
}

@Controller("services")
@UseGuards(SessionAuthGuard)
export class ServicesController {
  constructor(
    @Inject(ServicesService) private readonly services: ServicesService,
  ) {}

  @Get()
  async list(@RequestTenant() tenant: TenantParams) {
    const services = await this.services.listCatalog(tenant.tenantId);
    return { services };
  }

  @Get("me")
  async me(@RequestTenant() tenant: TenantParams) {
    const active = await this.services.activeServices(tenant.tenantId);
    return { active };
  }

  @Post(":key/enable")
  @UseGuards(AdminOnlyGuard)
  async enable(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("key") key: string,
  ) {
    return this.services.setStatus(
      tenant.tenantId,
      user.id,
      parseServiceKey(key),
      "ACTIVE",
    );
  }

  @Post(":key/disable")
  @UseGuards(AdminOnlyGuard)
  async disable(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("key") key: string,
  ) {
    return this.services.setStatus(
      tenant.tenantId,
      user.id,
      parseServiceKey(key),
      "DISABLED",
    );
  }
}

function parseServiceKey(key: string): ServiceKey {
  return serviceKeySchema.parse(key);
}