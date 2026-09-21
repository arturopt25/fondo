import type { FastifyRequest } from "fastify";

import type { TenantRole } from "@fondo/shared-types";

export interface CurrentUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly image: string | null;
}

export interface TenantContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly tenantName: string;
  readonly accountingCurrency: "USD" | "EUR";
  readonly timeZone: string;
  readonly role: TenantRole;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: CurrentUser;
  tenant: TenantContext;
}
