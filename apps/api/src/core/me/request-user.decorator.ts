import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import type { CurrentUser } from "../tenant/tenant-context.js";

export const RequestUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUser => {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user: CurrentUser }>();
    return request.user;
  },
);
