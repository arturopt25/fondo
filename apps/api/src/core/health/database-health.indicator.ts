import { Inject, Injectable } from "@nestjs/common";
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from "@nestjs/terminus";
import { PinoLogger } from "nestjs-pino";

import { PrismaService } from "../prisma.service.js";

class HealthCheckTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`timeout of ${timeoutMs}ms exceeded`);
    this.name = "HealthCheckTimeoutError";
  }
}

interface ErrorSummary {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
}

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    @Inject(HealthIndicatorService)
    private readonly healthIndicator: HealthIndicatorService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(PinoLogger)
    private readonly logger: PinoLogger,
  ) {}

  async check(timeoutMs: number): Promise<HealthIndicatorResult> {
    const session = this.healthIndicator.check("database");

    try {
      await withTimeout(
        this.prisma.client.$queryRawUnsafe("SELECT 1"),
        timeoutMs,
      );
      return session.up();
    } catch (error) {
      const summary = summarizeError(error);
      this.logger.warn(
        {
          errorName: summary.name,
          errorMessage: summary.message,
          ...(summary.code ? { errorCode: summary.code } : {}),
        },
        "database health check failed",
      );

      if (error instanceof HealthCheckTimeoutError) {
        return session.down(`timeout of ${timeoutMs}ms exceeded`);
      }

      return session.down();
    }
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new HealthCheckTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

function summarizeError(error: unknown): ErrorSummary {
  if (!(error instanceof Error)) {
    return {
      name: "UnknownError",
      message: sanitizeErrorMessage(String(error)),
    };
  }

  const candidate = error as { readonly code?: unknown; readonly errorCode?: unknown };
  let code: string | undefined;

  if (typeof candidate.code === "string") {
    code = candidate.code;
  } else if (typeof candidate.errorCode === "string") {
    code = candidate.errorCode;
  }

  return {
    name: error.name,
    message: sanitizeErrorMessage(error.message),
    ...(code ? { code } : {}),
  };
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/(password=)[^\s&]+/gi, "$1[REDACTED]");
}
