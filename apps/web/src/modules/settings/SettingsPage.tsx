import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconCheck,
  IconChevronRight,
  IconGlobe,
  IconLock,
  IconMoon,
  IconUser,
  IconWorld,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  supportedTimeZones,
  type DisplayCurrency,
  type SupportedTheme,
} from "@fondo/shared-types";
import { PageHeader } from "@fondo/ui";

import { useAppPreferences } from "../../app/preferences";
import {
  useChangePasswordMutation,
  useMeQuery,
  useRevokeOtherSessionsMutation,
  useRevokeSessionMutation,
  useSessionsQuery,
  useUpdateProfileMutation,
} from "./me-hooks";

const settingsSections = [
  { key: "profile", icon: IconUser },
  { key: "appearance", icon: IconMoon },
  { key: "languageRegion", icon: IconGlobe },
  { key: "security", icon: IconLock },
  { key: "data", icon: IconWorld },
] as const;

export function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const {
    theme,
    displayCurrency,
    locale,
    timeZone,
    setTheme,
    setDisplayCurrency,
    setLocale,
    setTimeZone,
  } = useAppPreferences();
  const meQuery = useMeQuery();
  const updateProfile = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const sessionsQuery = useSessionsQuery();
  const revokeSessionMutation = useRevokeSessionMutation();
  const revokeOthers = useRevokeOtherSessionsMutation();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  const user = meQuery.data?.user;
  const role = meQuery.data?.membership.role ?? "MEMBER";
  const isAdmin = role === "ADMIN";

  const profileName = nameDraft ?? user?.name ?? "";
  const sessions = sessionsQuery.data ?? [];

  function handleChangePassword(): void {
    if (newPassword.length < 8) {
      setPasswordError(t("settings.security.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.security.passwordMismatch"));
      return;
    }

    setPasswordError(null);
    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      },
    );
  }

  function handleRevokeSession(token: string): void {
    setRevokingToken(token);
    revokeSessionMutation.mutate(token, {
      onSettled: () => setRevokingToken(null),
    });
  }

  function formatSessionDate(value: Date): string {
    const dateFormat = new Intl.DateTimeFormat(
      locale === "en" ? "en-US" : "es-ES",
      { dateStyle: "medium", timeStyle: "short" },
    );
    return dateFormat.format(new Date(value));
  }

  function changeLocale(nextLocale: string | null): void {
    if (nextLocale === "es" || nextLocale === "en") {
      setLocale(nextLocale);
    }
  }

  function changeTheme(nextTheme: string | null): void {
    if (
      nextTheme === "light" ||
      nextTheme === "dark" ||
      nextTheme === "system"
    ) {
      setTheme(nextTheme as SupportedTheme);
    }
  }

  function changeCurrency(nextCurrency: string | null): void {
    if (nextCurrency === "USD" || nextCurrency === "EUR") {
      setDisplayCurrency(nextCurrency as DisplayCurrency);
    }
  }

  function changeTimeZone(nextTimeZone: string | null): void {
    if (nextTimeZone) {
      setTimeZone(nextTimeZone);
    }
  }

  function handleSaveProfile(): void {
    if (!user || nameDraft === null) {
      return;
    }
    updateProfile.mutate({ name: nameDraft });
  }

  return (
    <Stack className="page-stack" gap="xl">
      <PageHeader
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="settings-layout">
        <Card className="settings-nav" padding="sm" radius="lg" withBorder>
          <Text className="eyebrow" size="xs" px="sm" py="xs">
            {t("settings.preferences")}
          </Text>
          <Stack gap={4} mt="xs">
            {settingsSections.map((section, index) => (
              <Button
                key={section.key}
                className={
                  index === 0
                    ? "settings-nav__item settings-nav__item--active"
                    : "settings-nav__item"
                }
                variant="subtle"
                color="gray"
                justify="flex-start"
                leftSection={<section.icon size={17} stroke={1.7} />}
                rightSection={
                  index === 0 ? (
                    <IconCheck size={15} />
                  ) : (
                    <IconChevronRight size={15} />
                  )
                }
              >
                {t(`settings.sections.${section.key}`)}
              </Button>
            ))}
          </Stack>
        </Card>

        <Stack gap="md">
          <Card padding="xl" radius="lg" withBorder>
            <Group justify="space-between" align="flex-start" mb="xl">
              <Group gap="md">
                <Avatar color="signal" size={58} radius="lg">
                  AR
                </Avatar>
                <Stack gap={4}>
                  <Title order={3}>{t("settings.profile.title")}</Title>
                  <Text size="sm" c="dimmed">
                    {t("settings.profile.description")}
                  </Text>
                </Stack>
              </Group>
              <Badge color="teal" variant="light">
                {isAdmin
                  ? t("settings.profile.owner")
                  : t("settings.profile.member")}
              </Badge>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label={t("settings.profile.name")}
                value={profileName}
                onChange={(event) => setNameDraft(event.currentTarget.value)}
                disabled={!user}
              />
              <TextInput
                label={t("settings.profile.email")}
                value={user?.email ?? ""}
                readOnly
              />
            </SimpleGrid>
            <Group justify="flex-end" mt="xl">
              <Button
                color="signal"
                onClick={handleSaveProfile}
                loading={updateProfile.isPending}
                disabled={
                  !user || nameDraft === null || nameDraft === user?.name
                }
              >
                {t("settings.saveChanges")}
              </Button>
            </Group>
          </Card>

          <Card padding="xl" radius="lg" withBorder>
            <Group justify="space-between" mb="xl">
              <Stack gap={4}>
                <Title order={3}>{t("settings.appearance.title")}</Title>
                <Text size="sm" c="dimmed">
                  {t("settings.appearance.description")}
                </Text>
              </Stack>
              <IconMoon className="section-accent" size={22} stroke={1.5} />
            </Group>
            <Select
              label={t("settings.appearance.theme")}
              value={theme}
              onChange={changeTheme}
              data={[
                { value: "light", label: t("settings.appearance.light") },
                { value: "dark", label: t("settings.appearance.dark") },
                { value: "system", label: t("settings.appearance.system") },
              ]}
            />
          </Card>

          <Card padding="xl" radius="lg" withBorder>
            <Group justify="space-between" mb="xl">
              <Stack gap={4}>
                <Title order={3}>{t("settings.language.title")}</Title>
                <Text size="sm" c="dimmed">
                  {t("settings.language.description")}
                </Text>
              </Stack>
              <IconGlobe className="section-accent" size={22} stroke={1.5} />
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Select
                label={t("settings.language.language")}
                value={locale}
                onChange={changeLocale}
                data={[
                  { value: "es", label: t("settings.language.spanish") },
                  { value: "en", label: t("settings.language.english") },
                ]}
              />
              <Select
                label={t("settings.language.currency")}
                value={displayCurrency}
                onChange={changeCurrency}
                data={[
                  { value: "USD", label: t("settings.language.usd") },
                  { value: "EUR", label: t("settings.language.eur") },
                ]}
              />
              <Select
                label={t("settings.language.timezone")}
                value={timeZone}
                onChange={changeTimeZone}
                data={supportedTimeZones.map((zone) => ({
                  value: zone,
                  label: zone,
                }))}
                searchable
                nothingFoundMessage={t(
                  "settings.language.noTimeZoneMatch",
                )}
              />
            </SimpleGrid>
          </Card>

          <Card padding="xl" radius="lg" withBorder>
            <Group justify="space-between" mb="xl">
              <Stack gap={4}>
                <Title order={3}>{t("settings.security.title")}</Title>
                <Text size="sm" c="dimmed">
                  {t("settings.security.description")}
                </Text>
              </Stack>
              <IconLock className="section-accent" size={22} stroke={1.5} />
            </Group>
            <Stack gap="md">
              <PasswordInput
                label={t("settings.security.currentPassword")}
                placeholder={t("settings.security.passwordPlaceholder")}
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.currentTarget.value)
                }
                autoComplete="current-password"
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <PasswordInput
                  label={t("settings.security.newPassword")}
                  placeholder={t("settings.security.passwordPlaceholder")}
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.currentTarget.value)
                  }
                  autoComplete="new-password"
                  error={passwordError ?? undefined}
                />
                <PasswordInput
                  label={t("settings.security.confirmPassword")}
                  placeholder={t("settings.security.passwordPlaceholder")}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.currentTarget.value)
                  }
                  autoComplete="new-password"
                  error={passwordError ?? undefined}
                />
              </SimpleGrid>
              <Group justify="flex-end">
                <Button
                  color="signal"
                  onClick={handleChangePassword}
                  loading={changePasswordMutation.isPending}
                  disabled={
                    !currentPassword || !newPassword || !confirmPassword
                  }
                >
                  {t("settings.security.updatePassword")}
                </Button>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Stack gap={2}>
                  <Text size="sm" fw={600}>
                    {t("settings.security.sessions")}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t("settings.security.sessionsDescription")}
                  </Text>
                </Stack>
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => revokeOthers.mutate()}
                  loading={revokeOthers.isPending}
                  disabled={!sessions.some((session) => !session.isCurrent)}
                >
                  {t("settings.security.signOutOthers")}
                </Button>
              </Group>
              {sessionsQuery.isLoading ? (
                <Group gap="xs">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">
                    {t("settings.security.sessionsLoading")}
                  </Text>
                </Group>
              ) : sessionsQuery.isError ? (
                <Text size="sm" c="red">
                  {t("settings.security.sessionsError")}
                </Text>
              ) : sessions.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t("settings.security.noSessions")}
                </Text>
              ) : (
                <Stack gap="xs">
                  {sessions.map((session) => (
                    <Group
                      key={session.id}
                      justify="space-between"
                      wrap="nowrap"
                    >
                      <Stack gap={2} miw={0}>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="sm" fw={600} truncate>
                            {session.userAgent ??
                              t("settings.security.unknownDevice")}
                          </Text>
                          {session.isCurrent ? (
                            <Badge color="signal" variant="light" size="xs">
                              {t("settings.security.thisDevice")}
                            </Badge>
                          ) : null}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {session.ipAddress ?? "—"} ·{" "}
                          {t("settings.security.connectedAt", {
                            date: formatSessionDate(session.createdAt),
                          })}
                        </Text>
                      </Stack>
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() => handleRevokeSession(session.token)}
                        loading={
                          revokeSessionMutation.isPending &&
                          revokingToken === session.token
                        }
                        disabled={session.isCurrent}
                      >
                        {t("settings.security.revoke")}
                      </Button>
                    </Group>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>

          <Card
            className="settings-data-card"
            padding="xl"
            radius="lg"
            withBorder
          >
            <Stack gap={5}>
              <Title order={3}>{t("settings.data.title")}</Title>
              <Text size="sm" c="dimmed" maw={600}>
                {t("settings.data.description")}
              </Text>
            </Stack>
            <Group mt="xl">
              <Button variant="default" disabled>
                {t("settings.data.export")}
              </Button>
              <Button variant="subtle" color="red" disabled>
                {t("settings.data.delete")}
              </Button>
            </Group>
          </Card>
        </Stack>
      </div>
    </Stack>
  );
}
