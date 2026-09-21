import { Loader, MantineProvider, Stack, Text } from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { Notifications } from "@mantine/notifications";
import { lazy, Suspense } from "react";
import type { JSX } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { fondoTheme } from "@fondo/ui";

import { AppPreferencesProvider, useAppPreferences } from "./app/preferences";
import { AppLayout } from "./app/layouts/AppLayout";
import { AuthProvider } from "./modules/auth/auth-context";
import { ProtectedRoute, PublicOnlyRoute } from "./modules/auth/ProtectedRoute";

const DashboardPage = lazy(() =>
  import("./modules/dashboard/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const ReportsPage = lazy(() =>
  import("./modules/reports/ReportsPage").then((module) => ({
    default: module.ReportsPage,
  })),
);
const ServicesPage = lazy(() =>
  import("./modules/services/ServicesPage").then((module) => ({
    default: module.ServicesPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./modules/settings/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const AccountsPage = lazy(() =>
  import("./modules/finance/AccountsPage").then((module) => ({
    default: module.AccountsPage,
  })),
);
const CategoriesPage = lazy(() =>
  import("./modules/finance/CategoriesPage").then((module) => ({
    default: module.CategoriesPage,
  })),
);
const LoginPage = lazy(() =>
  import("./modules/auth/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import("./modules/auth/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppPreferencesProvider>
          <ThemedApplication />
        </AppPreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function ThemedApplication(): JSX.Element {
  const { theme } = useAppPreferences();
  const systemColorScheme = useColorScheme("dark");
  const colorScheme = theme === "system" ? systemColorScheme : theme;

  return (
    <MantineProvider theme={fondoTheme} forceColorScheme={colorScheme}>
      <Notifications position="top-right" />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/app/dashboard" replace />}
            />
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="services" element={<ServicesPage />} />
              </Route>
            </Route>
            <Route
              path="*"
              element={<Navigate to="/app/dashboard" replace />}
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </MantineProvider>
  );
}

function PageLoader(): JSX.Element {
  const { t } = useTranslation();

  return (
    <Stack align="center" justify="center" mih="60vh" gap="sm">
      <Loader color="signal" size="sm" aria-label={t("common.loading")} />
      <Text c="dimmed" size="sm">
        {t("common.loading")}
      </Text>
    </Stack>
  );
}
