import { createContext, useContext, useState } from "react";
import type { JSX, ReactNode } from "react";

import type { DisplayCurrency, SupportedTheme } from "@fondo/shared-types";

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
  const [theme, setThemeState] = useState<SupportedTheme>(() => readTheme());
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>(
    () => readDisplayCurrency(),
  );

  function setTheme(nextTheme: SupportedTheme): void {
    setThemeState(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
  }

  function setDisplayCurrency(nextCurrency: DisplayCurrency): void {
    setDisplayCurrencyState(nextCurrency);
    window.localStorage.setItem(currencyStorageKey, nextCurrency);
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
