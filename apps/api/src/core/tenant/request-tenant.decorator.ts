import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import type { TenantContext } from "./tenant-context.js";

export const RequestTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { tenant: TenantContext }>();
    return request.tenant;
  },
);