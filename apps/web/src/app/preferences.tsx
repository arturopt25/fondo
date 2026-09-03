import { createContext, useContext, useEffect, useState } from "react";
import type { JSX, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { DisplayCurrency, SupportedTheme } from "@fondo/shared-types";

import { api } from "../lib/api";
import { queryKeys } from "../lib/query-keys";
import { useSettingsQuery } from "../modules/settings/me-hooks";
import { useAuth } from "../modules/auth/auth-context";

interface AppPreferencesContextValue {
  readonly theme: SupportedTheme;
  readonly displayCurrency: DisplayCurrency;
  readonly setTheme: (theme: SupportedTheme) => void;
  readonly setDisplayCurrency: (currency: DisplayCurrency) => void;
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(
  null,
);
const themeStorageKey = "fondo.theme";
const currencyStorageKey = "fondo.displayCurrency";

function readTheme(): SupportedTheme {
  const value = window.localStorage.getItem(themeStorageKey);
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "dark";
}

function readDisplayCurrency(): DisplayCurrency {
  return window.localStorage.getItem(currencyStorageKey) === "EUR"
    ? "EUR"
    : "USD";
}

export function AppPreferencesProvider({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [theme, setThemeState] = useState<SupportedTheme>(() => readTheme());
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>(
    () => readDisplayCurrency(),
  );
  const { isAuthenticated } = useAuth();
  const settingsQuery = useSettingsQuery(isAuthenticated);

  useEffect(() => {
    const server = settingsQuery.data;
    if (!server) {
      return;
    }

    const serverTheme: SupportedTheme =
      server.theme === "light" ||
      server.theme === "dark" ||
      server.theme === "system"
        ? server.theme
        : "dark";
    const serverCurrency: DisplayCurrency =
      server.displayCurrency === "EUR" ? "EUR" : "USD";

    setThemeState((current) =>
      current === serverTheme ? current : serverTheme,
    );
    setDisplayCurrencyState((current) =>
      current === serverCurrency ? current : serverCurrency,
    );
  }, [settingsQuery.data]);

  function setTheme(nextTheme: SupportedTheme): void {
    setThemeState(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
    void api.patch("me/settings", { json: { theme: nextTheme } });
    queryClient.invalidateQueries({ queryKey: queryKeys.meSettings });
  }

  function setDisplayCurrency(nextCurrency: DisplayCurrency): void {
    setDisplayCurrencyState(nextCurrency);
    window.localStorage.setItem(currencyStorageKey, nextCurrency);
    void api.patch("me/settings", { json: { displayCurrency: nextCurrency } });
    queryClient.invalidateQueries({ queryKey: queryKeys.meSettings });
  }

  return (
    <AppPreferencesContext.Provider
      value={{ theme, displayCurrency, setTheme, setDisplayCurrency }}
    >
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences(): AppPreferencesContextValue {
  const context = useContext(AppPreferencesContext);

  if (!context) {
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider",
    );
  }

  return context;
}
