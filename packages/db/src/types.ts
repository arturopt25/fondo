import type { Prisma } from "@prisma/client";

export type TenantWithOwner = Prisma.TenantGetPayload<{
  include: { members: true };
}>;

export type MembershipWithTenant = Prisma.MembershipGetPayload<{
  include: { tenant: true };
}>;
