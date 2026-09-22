import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { JSX, ReactNode } from "react";

import { UNAUTHORIZED_EVENT } from "../../lib/api";
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
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const revalidationRef = useRef<Promise<void> | null>(null);

  const clearSession = useCallback(() => {
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchSession();
        if (!cancelled) {
          setSession(data);
        }
      } catch {
        // A failed initial check is treated as unauthenticated.
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

  useEffect(() => {
    function handleUnauthorized(): void {
      clearSession();
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [clearSession]);

  useEffect(() => {
    function revalidate(): void {
      if (document.visibilityState === "hidden" || revalidationRef.current) {
        return;
      }

      revalidationRef.current = fetchSession()
        .then((data) => {
          setSession(data);
        })
        .catch(() => {
          // Transient failures must not log the user out.
        })
        .finally(() => {
          revalidationRef.current = null;
        });
    }

    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);

    return () => {
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, []);

  async function refresh(): Promise<void> {
    const data = await fetchSession();
    setSession(data);
  }

  async function signOut(): Promise<void> {
    await apiSignOut();
    clearSession();
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