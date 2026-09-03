import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@fondo/db";

export interface PersonalTenantProvisioner {
  provisionForUser(userId: string, name: string): Promise<void>;
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return base || "personal";
}

export function createBetterAuth(provisioner: PersonalTenantProvisioner) {
  const databaseUrl = process.env.DATABASE_URL;
  const authUrl = process.env.BETTER_AUTH_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!authUrl) {
    throw new Error("BETTER_AUTH_URL is not set");
  }

  const auth = betterAuth({
    baseURL: authUrl,
    basePath: "/api/v1/auth",
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    user: {
      modelName: "User",
      fields: {
        name: "name",
        email: "email",
        emailVerified: "emailVerified",
        image: "image",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      },
    },
    session: {
      modelName: "Session",
      fields: {
        token: "token",
        expiresAt: "expiresAt",
        ipAddress: "ipAddress",
        userAgent: "userAgent",
        userId: "userId",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      },
    },
    account: {
      modelName: "Account",
      fields: {
        accountId: "accountId",
        providerId: "providerId",
        userId: "userId",
        accessToken: "accessToken",
        refreshToken: "refreshToken",
        idToken: "idToken",
        accessTokenExpiresAt: "accessTokenExpiresAt",
        refreshTokenExpiresAt: "refreshTokenExpiresAt",
        scope: "scope",
        password: "password",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      },
    },
    verification: {
      modelName: "Verification",
      fields: {
        identifier: "identifier",
        value: "value",
        expiresAt: "expiresAt",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID ?? "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
        disabled: !process.env.GITHUB_CLIENT_ID,
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        disabled: !process.env.GOOGLE_CLIENT_ID,
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await provisioner.provisionForUser(
              user.id,
              user.name ?? user.email,
            );
          },
        },
      },
    },
  });

  return auth;
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>;

export const buildPersonalTenantSlug = (
  userId: string,
  name: string,
): string => {
  const safeName = slugify(name);
  return `${safeName}-${userId.slice(0, 6).toLowerCase()}`;
};
