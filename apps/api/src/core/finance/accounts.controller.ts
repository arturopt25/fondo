import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  createAccountSchema,
  pageQuerySchema,
  updateAccountSchema,
} from "@fondo/shared-types";

import { SessionAuthGuard } from "../tenant/session-auth.guard.js";
import { RequestUser } from "../me/request-user.decorator.js";
import type { CurrentUser } from "../tenant/tenant-context.js";
import { RequestTenant } from "../tenant/request-tenant.decorator.js";
import { AccountsService } from "./accounts.service.js";

interface TenantParams {
  tenantId: string;
}

@Controller("accounts")
@UseGuards(SessionAuthGuard)
export class AccountsController {
  constructor(
    @Inject(AccountsService) private readonly accounts: AccountsService,
  ) {}

  @Get()
  async list(@RequestTenant() tenant: TenantParams, @Query() query: unknown) {
    const parsed = pageQuerySchema.parse(query);
    const sort = typeof (query as { sort?: unknown }).sort === "string"
      ? (query as { sort: string }).sort
      : undefined;

    return this.accounts.list(tenant.tenantId, {
      ...parsed,
      ...(sort !== undefined ? { sort } : {}),
    });
  }

  @Post()
  async create(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Body() body: unknown,
  ) {
    const input = createAccountSchema.parse(body);
    return this.accounts.create(tenant.tenantId, user.id, input);
  }

  @Patch(":id")
  async update(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const input = updateAccountSchema.parse(body);
    return this.accounts.update(tenant.tenantId, user.id, id, input);
  }

  @Post(":id/archive")
  async archive(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("id") id: string,
  ) {
    return this.accounts.archive(tenant.tenantId, user.id, id);
  }
}