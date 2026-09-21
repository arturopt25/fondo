import { createAuthClient } from "better-auth/client";

const authBaseUrl =
  import.meta.env.VITE_AUTH_URL ?? "http://localhost:3000/api/v1/auth";

export const authClient = createAuthClient({
  baseURL: authBaseUrl.replace(/\/$/, ""),
});

export type SessionUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly image: string | null;
};

export type SessionData = {
  readonly user: SessionUser;
};

export async function fetchSession(): Promise<SessionData | null> {
  const { data } = await authClient.getSession();

  if (!data) {
    return null;
  }

  return {
    user: {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      image: data.user.image ?? null,
    },
  };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<void> {
  const result = await authClient.signIn.email({ email, password });

  if (result.error) {
    throw new Error(result.error.message ?? "Unable to sign in");
  }
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  const result = await authClient.signUp.email({ name, email, password });

  if (result.error) {
    throw new Error(result.error.message ?? "Unable to create account");
  }
}

export async function signOut(): Promise<void> {
  await authClient.signOut();
}

export interface ActiveSession {
  readonly id: string;
  readonly token: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly isCurrent: boolean;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const result = await authClient.changePassword({
    currentPassword,
    newPassword,
    revokeOtherSessions: true,
  });

  if (result.error) {
    throw new Error(result.error.message ?? "Unable to change password");
  }
}

export async function listSessions(): Promise<ActiveSession[]> {
  const [sessionResult, sessionsResult] = await Promise.all([
    authClient.getSession(),
    authClient.listSessions(),
  ]);

  if (sessionsResult.error) {
    throw new Error(
      sessionsResult.error.message ?? "Unable to load active sessions",
    );
  }

  const currentToken = sessionResult.data?.session.token ?? null;

  return (sessionsResult.data ?? []).map((session) => ({
    id: session.id,
    token: session.token,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    ipAddress: session.ipAddress || null,
    userAgent: session.userAgent || null,
    isCurrent: session.token === currentToken,
  }));
}

export async function revokeSession(token: string): Promise<void> {
  const result = await authClient.revokeSession({ token });

  if (result.error) {
    throw new Error(result.error.message ?? "Unable to revoke session");
  }
}

export async function revokeOtherSessions(): Promise<void> {
  const sessions = await listSessions();
  const otherSessions = sessions.filter((session) => !session.isCurrent);

  await Promise.all(otherSessions.map((session) => revokeSession(session.token)));
}
