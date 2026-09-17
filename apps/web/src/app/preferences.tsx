import { createContext, useContext, useEffect, useState } from "react";
import type { JSX, ReactNode } from "react";

import type {
  DisplayCurrency,
  SupportedLocale,
  SupportedTheme,
} from "@fondo/shared-types";

import i18n from "../i18n";
import { useAuth } from "../modules/auth/auth-context";
import {
  useSettingsQuery,
  useUpdateSettingsMutation,
} from "../modules/settings/me-hooks";

interface AppPreferencesContextValue {
  readonly theme: SupportedTheme;
  readonly displayCurrency: DisplayCurrency;
  readonly locale: SupportedLocale;
  readonly timeZone: string;
  readonly setTheme: (theme: SupportedTheme) => void;
  readonly setDisplayCurrency: (currency: DisplayCurrency) => void;
  readonly setLocale: (locale: SupportedLocale) => void;
  readonly setTimeZone: (timeZone: string) => void;
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

function currentLocale(): SupportedLocale {
  return i18n.language.startsWith("en") ? "en" : "es";
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
  const [locale, setLocaleState] = useState<SupportedLocale>(() =>
    currentLocale(),
  );
  const [timeZone, setTimeZoneState] = useState<string>("UTC");
  const { isAuthenticated } = useAuth();
  const settingsQuery = useSettingsQuery(isAuthenticated);
  const updateSettings = useUpdateSettingsMutation();

  useEffect(() => {
    const server = settingsQuery.data;
    if (!server) {
      return;
    }

    setThemeState(server.theme);
    setDisplayCurrencyState(server.displayCurrency);
    setLocaleState(server.locale);
    setTimeZoneState(server.timeZone);
    void i18n.changeLanguage(server.locale);
  }, [settingsQuery.data]);

  function setTheme(nextTheme: SupportedTheme): void {
    setThemeState(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
    if (isAuthenticated) {
      updateSettings.mutate({ theme: nextTheme });
    }
  }

  function setDisplayCurrency(nextCurrency: DisplayCurrency): void {
    setDisplayCurrencyState(nextCurrency);
    window.localStorage.setItem(currencyStorageKey, nextCurrency);
    if (isAuthenticated) {
      updateSettings.mutate({ displayCurrency: nextCurrency });
    }
  }

  function setLocale(nextLocale: SupportedLocale): void {
    setLocaleState(nextLocale);
    void i18n.changeLanguage(nextLocale);
    if (isAuthenticated) {
      updateSettings.mutate({ locale: nextLocale });
    }
  }

  function setTimeZone(nextTimeZone: string): void {
    setTimeZoneState(nextTimeZone);
    if (isAuthenticated) {
      updateSettings.mutate({ timeZone: nextTimeZone });
    }
  }

  return (
    <AppPreferencesContext.Provider
      value={{
        theme,
        displayCurrency,
        locale,
        timeZone,
        setTheme,
        setDisplayCurrency,
        setLocale,
        setTimeZone,
      }}
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