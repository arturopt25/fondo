import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
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
import { startTransition } from "react";
import { useTranslation } from "react-i18next";

import type { DisplayCurrency, SupportedTheme } from "@fondo/shared-types";
import { PageHeader } from "@fondo/ui";

import { useAppPreferences } from "../../app/preferences";

const settingsSections = [
  { key: "profile", icon: IconUser },
  { key: "appearance", icon: IconMoon },
  { key: "languageRegion", icon: IconGlobe },
  { key: "security", icon: IconLock },
  { key: "data", icon: IconWorld },
] as const;

export function SettingsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { theme, displayCurrency, setTheme, setDisplayCurrency } =
    useAppPreferences();
  const currentLocale = i18n.language.startsWith("en") ? "en" : "es";

  function changeLocale(locale: string | null): void {
    if (locale !== "es" && locale !== "en") {
      return;
    }

    startTransition(() => {
      void i18n.changeLanguage(locale);
    });
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
                {t("settings.profile.owner")}
              </Badge>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label={t("settings.profile.name")}
                defaultValue="Arturo"
              />
              <TextInput
                label={t("settings.profile.email")}
                defaultValue="arturo@example.com"
                readOnly
              />
            </SimpleGrid>
            <Group justify="flex-end" mt="xl">
              <Button color="signal">{t("settings.saveChanges")}</Button>
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
                value={currentLocale}
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
                defaultValue="America/New_York"
                data={["America/New_York", "Europe/Madrid", "UTC"]}
              />
            </SimpleGrid>
            <Text size="xs" c="dimmed" mt="md">
              {t("settings.language.mockNote")}
            </Text>
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
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <PasswordInput
                  label={t("settings.security.newPassword")}
                  placeholder={t("settings.security.passwordPlaceholder")}
                />
                <PasswordInput
                  label={t("settings.security.confirmPassword")}
                  placeholder={t("settings.security.passwordPlaceholder")}
                />
              </SimpleGrid>
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
                <Switch
                  label={t("settings.security.sessionToggle")}
                  defaultChecked
                  color="signal"
                />
              </Group>
              <Group justify="flex-end">
                <Button variant="default">
                  {t("settings.security.updatePassword")}
                </Button>
              </Group>
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
