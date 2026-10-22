import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";

import { periodQuerySchema } from "@fondo/shared-types";

import { SessionAuthGuard } from "../tenant/session-auth.guard.js";
import { RequestTenant } from "../tenant/request-tenant.decorator.js";
import { RequestUser } from "../me/request-user.decorator.js";
import type { CurrentUser } from "../tenant/tenant-context.js";
import { ReportsService } from "./reports.service.js";

interface TenantParams {
  tenantId: string;
  timeZone: string;
}

@Controller("reports")
@UseGuards(SessionAuthGuard)
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
  ) {}

  @Get("dashboard")
  async dashboard(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Query() query: unknown,
  ) {
    const parsed = periodQuerySchema.parse(query);
    return this.reports.dashboard(
      tenant.tenantId,
      user.id,
      tenant.timeZone,
      parsed,
    );
  }

  @Get("cash-flow")
  async cashFlow(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Query() query: unknown,
  ) {
    const parsed = periodQuerySchema.parse(query);
    return this.reports.cashFlow(
      tenant.tenantId,
      user.id,
      tenant.timeZone,
      parsed,
    );
  }

  @Get("category-spend")
  async categorySpend(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Query() query: unknown,
  ) {
    const parsed = periodQuerySchema.parse(query);
    return this.reports.categorySpend(tenant.tenantId, user.id, parsed);
  }
}
