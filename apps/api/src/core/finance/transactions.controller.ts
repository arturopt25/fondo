import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  PayloadTooLargeException,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
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
import { API_WRITE_THROTTLE } from "../config/rate-limits.js";
import { API_UPLOAD_THROTTLE } from "../config/rate-limits.js";
import { StorageService } from "../storage/storage.service.js";
import type { FastifyRequest } from "fastify";

interface TenantParams {
  tenantId: string;
}

@Controller("transactions")
@UseGuards(SessionAuthGuard)
export class TransactionsController {
  constructor(
    @Inject(TransactionsService)
    private readonly transactions: TransactionsService,
    @Inject(StorageService)
    private readonly storage: StorageService,
  ) {}

  @Get()
  async list(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Query() query: unknown,
  ) {
    const parsed = pageQuerySchema.parse(query);
    const ledgerId =
      typeof (query as { ledgerId?: unknown }).ledgerId === "string"
        ? (query as { ledgerId: string }).ledgerId
        : undefined;
    const type =
      typeof (query as { type?: unknown }).type === "string"
        ? (query as { type: string }).type
        : undefined;

    return this.transactions.list(tenant.tenantId, user.id, {
      ...parsed,
      ...(ledgerId !== undefined ? { ledgerId } : {}),
      ...(type !== undefined ? { type } : {}),
    });
  }

  @Post("income")
  @Throttle(API_WRITE_THROTTLE)
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
  @Throttle(API_WRITE_THROTTLE)
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
  @Throttle(API_WRITE_THROTTLE)
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
  @Throttle(API_WRITE_THROTTLE)
  async reverse(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const input = reverseTransactionSchema.parse(body ?? {});
    return this.transactions.reverse(tenant.tenantId, user.id, id, input.note);
  }

  @Post(":id/attachments")
  @Throttle(API_UPLOAD_THROTTLE)
  async addAttachment(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("id") transactionId: string,
    @Req() request: FastifyRequest,
  ) {
    const file = await request.file({
      limits: {
        fileSize: this.storage.maxFileSizeBytes,
        files: 1,
      },
    });

    if (!file) {
      throw new BadRequestException("Attachment file is required");
    }

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (error) {
      if (isMultipartFileTooLarge(error)) {
        throw new PayloadTooLargeException(
          `Attachment exceeds the maximum allowed size of ${this.storage.maxFileSizeBytes} bytes`,
        );
      }
      throw error;
    }

    return this.transactions.addAttachment(
      tenant.tenantId,
      user.id,
      transactionId,
      buffer,
      file.filename,
      file.mimetype,
    );
  }

  @Get(":id/attachments")
  async listAttachments(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("id") transactionId: string,
  ) {
    return this.transactions.listAttachments(
      tenant.tenantId,
      user.id,
      transactionId,
    );
  }

  @Delete(":id/attachments/:attachmentId")
  @Throttle(API_UPLOAD_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @RequestTenant() tenant: TenantParams,
    @RequestUser() user: CurrentUser,
    @Param("id") transactionId: string,
    @Param("attachmentId") attachmentId: string,
  ): Promise<void> {
    await this.transactions.deleteAttachment(
      tenant.tenantId,
      user.id,
      transactionId,
      attachmentId,
    );
  }
}

function isMultipartFileTooLarge(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "FST_REQ_FILE_TOO_LARGE"
  );
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
    @RequestUser() user: CurrentUser,
    @Query() query: unknown,
  ) {
    const ledgerId =
      typeof (query as { ledgerId?: unknown }).ledgerId === "string"
        ? (query as { ledgerId: string }).ledgerId
        : undefined;
    return this.transactions.balance(tenant.tenantId, user.id, ledgerId);
  }
}

function idempotencyKeyFrom(request: FastifyRequest): string | undefined {
  const header = request.headers["idempotency-key"];
  if (typeof header !== "string" || header.trim() === "") {
    return undefined;
  }
  return header.trim();
}
