import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fondoTheme } from "@fondo/ui";

vi.mock("@mantine/core", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  const Select = ({
    label,
    value,
    onChange,
    data,
  }: {
    readonly label?: string;
    readonly value?: string | null;
    readonly onChange?: (value: string | null) => void;
    readonly data?: ReadonlyArray<{
      readonly value: string;
      readonly label: string;
    }>;
  }) => (
    <div>
      <span>{label ?? ""}</span>
      <select
        data-testid={`select-${String(label)}`}
        value={value ?? ""}
        onChange={(event) => onChange?.(event.currentTarget.value)}
      >
        {(data ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return { ...actual, Select };
});

const meHooks = vi.hoisted(() => ({
  useMeQuery: vi.fn(),
  useUpdateProfileMutation: vi.fn(),
  useChangePasswordMutation: vi.fn(),
  useSessionsQuery: vi.fn(),
  useRevokeSessionMutation: vi.fn(),
  useRevokeOtherSessionsMutation: vi.fn(),
  useSettingsQuery: vi.fn(),
  useUpdateSettingsMutation: vi.fn(),
}));
const auth = vi.hoisted(() => ({ useAuth: vi.fn() }));
const i18n = vi.hoisted(() => ({
  language: "es",
  changeLanguage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../../../../i18n", () => ({ default: i18n }));
vi.mock("../../../../modules/auth/auth-context", () => ({
  useAuth: auth.useAuth,
}));
vi.mock("../../../../modules/settings/me-hooks", () => ({
  useMeQuery: meHooks.useMeQuery,
  useUpdateProfileMutation: meHooks.useUpdateProfileMutation,
  useChangePasswordMutation: meHooks.useChangePasswordMutation,
  useSessionsQuery: meHooks.useSessionsQuery,
  useRevokeSessionMutation: meHooks.useRevokeSessionMutation,
  useRevokeOtherSessionsMutation: meHooks.useRevokeOtherSessionsMutation,
  useSettingsQuery: meHooks.useSettingsQuery,
  useUpdateSettingsMutation: meHooks.useUpdateSettingsMutation,
}));

import { AppPreferencesProvider } from "../../../../app/preferences";
import { SettingsPage } from "../../../../modules/settings/SettingsPage";

function renderSettings() {
  return render(
    <MantineProvider theme={fondoTheme}>
      <AppPreferencesProvider>
        <SettingsPage />
      </AppPreferencesProvider>
    </MantineProvider>,
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.useAuth.mockReturnValue({ isAuthenticated: true });
    meHooks.useSettingsQuery.mockReturnValue({
      data: {
        theme: "dark",
        displayCurrency: "USD",
        locale: "es",
        timeZone: "UTC",
      },
    });
    meHooks.useUpdateSettingsMutation.mockReturnValue({ mutate: vi.fn() });
    meHooks.useMeQuery.mockReturnValue({
      data: {
        user: { id: "u1", name: "Arturo", email: "a@b.c", image: null },
        membership: { role: "ADMIN" },
        settings: {
          theme: "dark",
          displayCurrency: "USD",
          locale: "es",
          timeZone: "UTC",
        },
      },
    });
    meHooks.useUpdateProfileMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    meHooks.useChangePasswordMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    meHooks.useSessionsQuery.mockReturnValue({
      data: [
        {
          id: "s1",
          token: "t1",
          createdAt: new Date(),
          expiresAt: new Date(),
          ipAddress: "1.2.3.4",
          userAgent: "Chrome",
          isCurrent: true,
        },
      ],
      isLoading: false,
      isError: false,
    });
    meHooks.useRevokeSessionMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    meHooks.useRevokeOtherSessionsMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders the security card with the current session", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(
      screen.getByRole("button", { name: "settings.sections.security" }),
    );

    expect(screen.getByText("settings.security.sessions")).toBeInTheDocument();
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(
      screen.getByText("settings.security.thisDevice"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "settings.security.revoke" }),
    ).toBeDisabled();
  });

  it("shows a validation error for a short new password", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(
      screen.getByRole("button", { name: "settings.sections.security" }),
    );

    const inputs = screen.getAllByPlaceholderText(
      "settings.security.passwordPlaceholder",
    );
    await user.type(inputs[0] ?? document.body, "old-password");
    await user.type(inputs[1] ?? document.body, "short");
    await user.type(inputs[2] ?? document.body, "short");

    await user.click(
      screen.getByRole("button", { name: "settings.security.updatePassword" }),
    );

    expect(
      screen.getAllByText("settings.security.passwordTooShort").length,
    ).toBeGreaterThan(0);
  });
});