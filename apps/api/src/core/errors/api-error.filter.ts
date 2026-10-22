import {
  Catch,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { PinoLogger } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

import type { AuthenticatedRequest } from "../tenant/tenant-context.js";

interface ErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
    readonly requestId: string;
  };
}

@Catch()
@Injectable()
export class ApiErrorFilter implements ExceptionFilter {
  constructor(@Inject(PinoLogger) private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const request = host
      .switchToHttp()
      .getRequest<
        FastifyRequest &
          Partial<Pick<AuthenticatedRequest, "tenant" | "user">>
      >();
    const requestId =
      typeof request.id === "string" ? request.id : randomUUID();
    response.header("X-Request-Id", requestId);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "Something went wrong";
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "object" && body !== null && "message" in body) {
        message = String((body as { message: unknown }).message);
      } else {
        message = exception.message;
      }
      code = httpStatusToCode(status);
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      code = "VALIDATION_ERROR";
      message = "Invalid request body";
      details = exception.issues;
    } else if (exception instanceof Error && "code" in exception) {
      code = String((exception as { code: unknown }).code);
    }

    const logContext = {
      requestId,
      method: request.method,
      path: request.url.split("?")[0],
      ...(request.tenant
        ? { tenantId: request.tenant.tenantId }
        : {}),
      ...(request.user
        ? { userId: request.user.id }
        : {}),
    };

    if (status >= 500) {
      this.logger.error(
        {
          ...logContext,
          ...(exception instanceof Error ? { err: exception } : {}),
        },
        "request failed",
      );
    } else {
      this.logger.warn(logContext, "request rejected");
    }

    const errorBody: ErrorBody = {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
        requestId,
      },
    };

    void response.status(status).send(errorBody);
  }
}

function httpStatusToCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "VALIDATION_ERROR";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    case HttpStatus.TOO_MANY_REQUESTS:
      return "RATE_LIMITED";
    default:
      return "INTERNAL_ERROR";
  }
}
