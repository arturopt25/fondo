import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fondoTheme } from "@fondo/ui";

const authClient = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signOut: vi.fn(),
}));
const auth = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../../../../modules/auth/auth-client", () => ({
  signInWithEmail: authClient.signInWithEmail,
  signUpWithEmail: authClient.signUpWithEmail,
  signOut: authClient.signOut,
}));
vi.mock("../../../../modules/auth/auth-context", () => ({ useAuth: auth.useAuth }));

import { LoginPage } from "../../../../modules/auth/LoginPage";

function renderLogin() {
  return render(
    <MantineProvider theme={fondoTheme}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.useAuth.mockReturnValue({
      refresh: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("submits credentials on submit", async () => {
    const user = userEvent.setup();
    authClient.signInWithEmail.mockResolvedValue(undefined);
    renderLogin();

    await user.type(
      screen.getByPlaceholderText("auth.emailPlaceholder"),
      "arturo@example.com",
    );
    await user.type(
      screen.getByPlaceholderText("auth.passwordPlaceholder"),
      "password123",
    );
    await user.click(screen.getByRole("button", { name: "auth.signIn" }));

    expect(authClient.signInWithEmail).toHaveBeenCalledWith(
      "arturo@example.com",
      "password123",
    );
  });

  it("shows a field error for an invalid email", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(
      screen.getByPlaceholderText("auth.emailPlaceholder"),
      "not-an-email",
    );
    await user.type(
      screen.getByPlaceholderText("auth.passwordPlaceholder"),
      "password123",
    );
    await user.click(screen.getByRole("button", { name: "auth.signIn" }));

    expect(
      await screen.findByText("auth.validation.emailInvalid"),
    ).toBeInTheDocument();
    expect(authClient.signInWithEmail).not.toHaveBeenCalled();
  });

  it("surfaces the API error message", async () => {
    const user = userEvent.setup();
    authClient.signInWithEmail.mockRejectedValue(
      new Error("auth.invalidCredentials"),
    );
    renderLogin();

    await user.type(
      screen.getByPlaceholderText("auth.emailPlaceholder"),
      "arturo@example.com",
    );
    await user.type(
      screen.getByPlaceholderText("auth.passwordPlaceholder"),
      "password123",
    );
    await user.click(screen.getByRole("button", { name: "auth.signIn" }));

    expect(
      await screen.findByText("auth.invalidCredentials"),
    ).toBeInTheDocument();
  });
});