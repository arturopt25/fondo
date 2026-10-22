import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { Params } from "nestjs-pino";

import type { LogLevel } from "../config/app-config.js";
import type { AuthenticatedRequest } from "../tenant/tenant-context.js";

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LOGGER_REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers.set-cookie",
  "req.body.password",
  "req.body.currentPassword",
  "req.body.newPassword",
  "req.body.confirmPassword",
  "req.body.token",
  "req.body.accessToken",
  "req.body.refreshToken",
  "req.body.idToken",
  "req.body.verificationToken",
  "req.body.resetToken",
  "req.query.token",
  "req.query.access_token",
  "req.query.refresh_token",
  "req.query.id_token",
  "req.query.code",
  'res.headers["set-cookie"]',
] as const;

interface LoggerRequest extends IncomingMessage {
  readonly id?: string | number;
  readonly body?: unknown;
  readonly tenant?: AuthenticatedRequest["tenant"];
  readonly user?: AuthenticatedRequest["user"];
}

export function isValidRequestId(value: unknown): value is string {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value);
}

export function generateRequestId(
  value: string | string[] | undefined,
): string {
  const requestId = Array.isArray(value) ? value[0] : value;
  return isValidRequestId(requestId) ? requestId : randomUUID();
}

export function generateRequestIdFromRequest(
  request: IncomingMessage,
): string {
  return generateRequestId(request.headers["x-request-id"]);
}

function urlWithoutQuery(url: string | undefined): string | undefined {
  if (!url) {
    return url;
  }

  const queryIndex = url.indexOf("?");
  return queryIndex >= 0 ? url.slice(0, queryIndex) : url;
}

function requestSerializer(request: LoggerRequest): Record<string, unknown> {
  return {
    id: request.id,
    method: request.method,
    url: urlWithoutQuery(request.url),
    headers: request.headers,
    remoteAddress: request.socket?.remoteAddress,
  };
}

function customRequestProperties(request: LoggerRequest): Record<string, string> {
  const authenticated = request;
  const properties: Record<string, string> = {};

  if (authenticated.tenant?.tenantId) {
    properties.tenantId = authenticated.tenant.tenantId;
  }
  if (authenticated.user?.id) {
    properties.userId = authenticated.user.id;
  }

  return properties;
}

export function createLoggerParams(level: LogLevel): Params<
  LoggerRequest,
  ServerResponse
> {
  return {
    assignResponse: true,
    pinoHttp: {
      level,
      genReqId: (request, response) => {
        const id = generateRequestId(request.headers["x-request-id"]);

        response.setHeader("X-Request-Id", id);
        return id;
      },
      redact: {
        paths: [...LOGGER_REDACT_PATHS],
        censor: "[REDACTED]",
      },
      serializers: {
        req: requestSerializer,
      },
      customProps: customRequestProperties,
    },
  };
}

export function createFastifyLoggerOptions(level: LogLevel) {
  return {
    level,
    redact: {
      paths: [...LOGGER_REDACT_PATHS],
      censor: "[REDACTED]",
    },
    serializers: {
      req: requestSerializer,
    },
  };
}
