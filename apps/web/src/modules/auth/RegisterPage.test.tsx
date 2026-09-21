import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fondoTheme } from "@fondo/ui";

const authClient = vi.hoisted(() => ({
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
}));
const auth = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("./auth-client", () => ({
  signUpWithEmail: authClient.signUpWithEmail,
  signInWithEmail: authClient.signInWithEmail,
  signOut: authClient.signOut,
}));
vi.mock("./auth-context", () => ({ useAuth: auth.useAuth }));

import { RegisterPage } from "./RegisterPage";

function renderRegister() {
  return render(
    <MantineProvider theme={fondoTheme}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.useAuth.mockReturnValue({
      refresh: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("registers with name, email and password", async () => {
    const user = userEvent.setup();
    authClient.signUpWithEmail.mockResolvedValue(undefined);
    renderRegister();

    await user.type(
      screen.getByPlaceholderText("auth.namePlaceholder"),
      "Arturo",
    );
    await user.type(
      screen.getByPlaceholderText("auth.emailPlaceholder"),
      "arturo@example.com",
    );
    await user.type(
      screen.getByPlaceholderText("auth.passwordPlaceholder"),
      "password123",
    );
    await user.click(screen.getByRole("button", { name: "auth.signUp" }));

    expect(authClient.signUpWithEmail).toHaveBeenCalledWith(
      "Arturo",
      "arturo@example.com",
      "password123",
    );
  });

  it("rejects a short password", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(
      screen.getByPlaceholderText("auth.namePlaceholder"),
      "Arturo",
    );
    await user.type(
      screen.getByPlaceholderText("auth.emailPlaceholder"),
      "arturo@example.com",
    );
    await user.type(
      screen.getByPlaceholderText("auth.passwordPlaceholder"),
      "short",
    );
    await user.click(screen.getByRole("button", { name: "auth.signUp" }));

    expect(
      await screen.findByText("auth.validation.passwordMin"),
    ).toBeInTheDocument();
    expect(authClient.signUpWithEmail).not.toHaveBeenCalled();
  });
});