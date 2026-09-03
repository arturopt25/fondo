import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

interface ErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
    readonly requestId: string;
  };
}

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    const requestId =
      typeof request.headers["x-request-id"] === "string"
        ? request.headers["x-request-id"]
        : randomUUID();

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
    } else if (exception instanceof Error && "code" in exception) {
      code = String((exception as { code: unknown }).code);
    }

    if (status >= 500) {
      this.logger.error(
        `request ${requestId} failed: ${exception instanceof Error ? exception.stack : String(exception)}`,
      );
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
