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
