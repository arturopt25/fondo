import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { JSX } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authClient = vi.hoisted(() => ({
  fetchSession: vi.fn(),
  signOut: vi.fn(),
}));

const unauthorizedEvent = vi.hoisted(() => "fondo:unauthorized");

vi.mock("./auth-client", () => ({
  fetchSession: authClient.fetchSession,
  signOut: authClient.signOut,
}));
vi.mock("../../lib/api", () => ({
  UNAUTHORIZED_EVENT: unauthorizedEvent,
}));

import { AuthProvider, useAuth } from "./auth-context";

function validSession() {
  return {
    user: {
      id: "user-1",
      name: "Arturo",
      email: "arturo@example.com",
      image: null,
    },
  };
}

function Probe(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
    </>
  );
}

function renderProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );

  return queryClient;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authClient.signOut.mockResolvedValue(undefined);
  });

  it("loads a valid session on mount", async () => {
    authClient.fetchSession.mockResolvedValue(validSession());

    renderProvider();

    expect(await screen.findByTestId("authenticated")).toHaveTextContent(
      "true",
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("clears the session when a 401 is reported", async () => {
    authClient.fetchSession.mockResolvedValue(validSession());
    renderProvider();

    await screen.findByTestId("authenticated");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");

    act(() => {
      window.dispatchEvent(new Event(unauthorizedEvent));
    });

    await waitFor(() =>
      expect(screen.getByTestId("authenticated")).toHaveTextContent("false"),
    );
  });

  it("revalidates the session when the window regains focus", async () => {
    authClient.fetchSession.mockResolvedValue(null);
    renderProvider();

    await screen.findByTestId("loading");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");

    authClient.fetchSession.mockResolvedValue(validSession());
    window.dispatchEvent(new Event("focus"));

    await waitFor(() =>
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true"),
    );
  });

  it("keeps the session when revalidation fails transiently", async () => {
    authClient.fetchSession.mockResolvedValue(validSession());
    renderProvider();

    await screen.findByTestId("authenticated");

    authClient.fetchSession.mockRejectedValue(new Error("network"));
    window.dispatchEvent(new Event("focus"));

    await waitFor(() =>
      expect(authClient.fetchSession).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
  });
});
