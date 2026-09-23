import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import {
  createExpenseSchema,
  createIncomeSchema,
  createTransferSchema,
  pageQuerySchema,
  reverseTransactionSchema,
} from "@fondo/shared-types";

import { SessionAuthGuard } from "../tenant/session-auth.guard.js";
import { RequestUser } from "../me/request-user.decorator.js";
import type { CurrentUser } from "../tenant/tenant-context.js";
import { RequestTenant } from "../tenant/request-tenant.decorator.js";
import { TransactionsService } from "./transactions.service.js";

interface TenantParams {
  tenantId: string;
}

@Controller("transactions")
@UseGuards(SessionAuthGuard)
export class TransactionsController {
  constructor(
    @Inject(TransactionsService)
    private readonly transactions: TransactionsService,
  ) {}

  @Get()
  async list(@RequestTenant() tenant: TenantParams, @Query() query: unknown) {
    const parsed = pageQuerySchema.parse(query);
    const ledgerId =
      typeof (query as { ledgerId?: unknown }).ledgerId === "string"
        ? (query as { ledgerId: string }).ledgerId
        : undefined;
    const type =
      typeof (query as { type?: unknown }).type === "string"
        ? (query as { type: string }).type
        : undefined;

    return this.transactions.list(tenant.tenantId, {
      ...parsed,
      ...(ledgerId !== undefined ? { ledgerId } : {}),
      ...(type !== undefined ? { type } : {}),
    });
  }

  @Post("income")
  async createIncome(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const input = createIncomeSchema.parse(body);
    return this.transactions.createIncome(
      tenant.tenantId,
      user.id,
      input,
      idempotencyKeyFrom(request),
    );
  }

  @Post("expense")
  async createExpense(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const input = createExpenseSchema.parse(body);
    return this.transactions.createExpense(
      tenant.tenantId,
      user.id,
      input,
      idempotencyKeyFrom(request),
    );
  }

  @Post("transfer")
  async createTransfer(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const input = createTransferSchema.parse(body);
    return this.transactions.createTransfer(
      tenant.tenantId,
      user.id,
      input,
      idempotencyKeyFrom(request),
    );
  }

  @Post(":id/reverse")
  async reverse(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const input = reverseTransactionSchema.parse(body ?? {});
    return this.transactions.reverse(tenant.tenantId, user.id, id, input.note);
  }
}

@Controller("ledger")
@UseGuards(SessionAuthGuard)
export class LedgerController {
  constructor(
    @Inject(TransactionsService)
    private readonly transactions: TransactionsService,
  ) {}

  @Get("balance")
  async balance(
    @RequestTenant() tenant: TenantParams,
    @Query() query: unknown,
  ) {
    const ledgerId =
      typeof (query as { ledgerId?: unknown }).ledgerId === "string"
        ? (query as { ledgerId: string }).ledgerId
        : undefined;
    return this.transactions.balance(tenant.tenantId, ledgerId);
  }
}

function idempotencyKeyFrom(request: FastifyRequest): string | undefined {
  const header = request.headers["idempotency-key"];
  if (typeof header !== "string" || header.trim() === "") {
    return undefined;
  }
  return header.trim();
}
