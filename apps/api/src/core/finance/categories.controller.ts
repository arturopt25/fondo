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
  createCategorySchema,
  pageQuerySchema,
  updateCategorySchema,
} from "@fondo/shared-types";

import { SessionAuthGuard } from "../tenant/session-auth.guard.js";
import { RequestUser } from "../me/request-user.decorator.js";
import type { CurrentUser } from "../tenant/tenant-context.js";
import { RequestTenant } from "../tenant/request-tenant.decorator.js";
import { CategoriesService } from "./categories.service.js";

interface TenantParams {
  tenantId: string;
}

@Controller("categories")
@UseGuards(SessionAuthGuard)
export class CategoriesController {
  constructor(
    @Inject(CategoriesService)
    private readonly categories: CategoriesService,
  ) {}

  @Get()
  async list(@RequestTenant() tenant: TenantParams, @Query() query: unknown) {
    const parsed = pageQuerySchema.parse(query);
    const raw = query as { sort?: unknown; type?: unknown };
    const sort = typeof raw.sort === "string" ? raw.sort : undefined;
    const type = typeof raw.type === "string" ? raw.type : undefined;

    return this.categories.list(tenant.tenantId, {
      ...parsed,
      ...(sort !== undefined ? { sort } : {}),
      ...(type !== undefined ? { type } : {}),
    });
  }

  @Post()
  async create(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Body() body: unknown,
  ) {
    const input = createCategorySchema.parse(body);
    return this.categories.create(tenant.tenantId, user.id, input);
  }

  @Patch(":id")
  async update(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const input = updateCategorySchema.parse(body);
    return this.categories.update(tenant.tenantId, user.id, id, input);
  }

  @Post(":id/archive")
  async archive(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("id") id: string,
  ) {
    return this.categories.archive(tenant.tenantId, user.id, id);
  }
}