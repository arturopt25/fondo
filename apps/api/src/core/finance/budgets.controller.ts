import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";

import { budgetQuerySchema, upsertBudgetSchema } from "@fondo/shared-types";

import { RequestUser } from "../me/request-user.decorator.js";
import type { CurrentUser } from "../tenant/tenant-context.js";
import { RequestTenant } from "../tenant/request-tenant.decorator.js";
import { SessionAuthGuard } from "../tenant/session-auth.guard.js";
import { BudgetsService } from "./budgets.service.js";

interface TenantParams {
  tenantId: string;
}

@Controller("budgets")
@UseGuards(SessionAuthGuard)
export class BudgetsController {
  constructor(
    @Inject(BudgetsService) private readonly budgets: BudgetsService,
  ) {}

  @Get()
  async list(@RequestTenant() tenant: TenantParams, @Query() query: unknown) {
    return this.budgets.list(tenant.tenantId, budgetQuerySchema.parse(query));
  }

  @Put()
  async upsert(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Body() body: unknown,
  ) {
    return this.budgets.upsert(
      tenant.tenantId,
      user.id,
      upsertBudgetSchema.parse(body),
    );
  }

  @Delete(":id")
  async remove(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("id") id: string,
  ) {
    return this.budgets.remove(tenant.tenantId, user.id, id);
  }
}
