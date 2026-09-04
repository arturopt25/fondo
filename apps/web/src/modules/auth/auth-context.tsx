import { createContext, useContext, useEffect, useState } from "react";
import type { JSX, ReactNode } from "react";

import {
  fetchSession,
  signOut as apiSignOut,
  type SessionData,
} from "./auth-client";

interface AuthContextValue {
  readonly session: SessionData | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly refresh: () => Promise<void>;
  readonly signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchSession();
        if (!cancelled) {
          setSession(data);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh(): Promise<void> {
    const data = await fetchSession();
    setSession(data);
  }

  async function signOut(): Promise<void> {
    await apiSignOut();
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isAuthenticated: session !== null,
        refresh,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
