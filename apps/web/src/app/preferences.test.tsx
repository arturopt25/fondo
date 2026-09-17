import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const meHooks = vi.hoisted(() => ({
  useSettingsQuery: vi.fn(),
  useUpdateSettingsMutation: vi.fn(),
}));
const auth = vi.hoisted(() => ({ useAuth: vi.fn() }));
const i18n = vi.hoisted(() => ({
  language: "es",
  changeLanguage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../i18n", () => ({ default: i18n }));
vi.mock("../modules/auth/auth-context", () => ({
  useAuth: auth.useAuth,
}));
vi.mock("../modules/settings/me-hooks", () => ({
  useSettingsQuery: meHooks.useSettingsQuery,
  useUpdateSettingsMutation: meHooks.useUpdateSettingsMutation,
}));

import { AppPreferencesProvider, useAppPreferences } from "./preferences";

function PreferencesConsumer() {
  const { theme, displayCurrency, locale, timeZone, setTheme, setLocale } =
    useAppPreferences();

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="currency">{displayCurrency}</span>
      <span data-testid="locale">{locale}</span>
      <span data-testid="timezone">{timeZone}</span>
      <button onClick={() => setTheme("light")}>set-light</button>
      <button onClick={() => setLocale("en")}>set-en</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AppPreferencesProvider>
      <PreferencesConsumer />
    </AppPreferencesProvider>,
  );
}

describe("AppPreferencesProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    i18n.language = "es";
    auth.useAuth.mockReturnValue({ isAuthenticated: true });
  });

  it("applies server settings once they load", async () => {
    meHooks.useSettingsQuery.mockReturnValue({
      data: {
        theme: "light",
        displayCurrency: "EUR",
        locale: "en",
        timeZone: "Europe/Madrid",
      },
    });
    meHooks.useUpdateSettingsMutation.mockReturnValue({ mutate: vi.fn() });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("light");
    });
    expect(screen.getByTestId("currency")).toHaveTextContent("EUR");
    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(screen.getByTestId("timezone")).toHaveTextContent("Europe/Madrid");
    expect(i18n.changeLanguage).toHaveBeenCalledWith("en");
  });

  it("persists preference changes through the settings mutation when authenticated", async () => {
    const mutate = vi.fn();
    meHooks.useSettingsQuery.mockReturnValue({ data: undefined });
    meHooks.useUpdateSettingsMutation.mockReturnValue({ mutate });

    renderProvider();
    await userEvent.click(screen.getByText("set-light"));

    expect(mutate).toHaveBeenCalledWith({ theme: "light" });
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("keeps preferences local without a mutation when unauthenticated", async () => {
    auth.useAuth.mockReturnValue({ isAuthenticated: false });
    const mutate = vi.fn();
    meHooks.useSettingsQuery.mockReturnValue({ data: undefined });
    meHooks.useUpdateSettingsMutation.mockReturnValue({ mutate });

    renderProvider();
    await userEvent.click(screen.getByText("set-light"));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });
});