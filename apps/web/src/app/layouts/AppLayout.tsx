import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Burger,
  Button,
  Divider,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBell,
  IconChartHistogram,
  IconChevronRight,
  IconCreditCard,
  IconLayoutDashboard,
  IconLogout,
  IconMenu2,
  IconSettings,
  IconSparkles,
  IconStack2,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, Outlet, useLocation } from "react-router-dom";
import type { JSX } from "react";

import { FondoBrand } from "@fondo/ui";

const navigation = [
  {
    to: "/app/dashboard",
    labelKey: "navigation.dashboard",
    icon: IconLayoutDashboard,
  },
  {
    to: "/app/reports",
    labelKey: "navigation.reports",
    icon: IconChartHistogram,
  },
  { to: "/app/settings", labelKey: "navigation.settings", icon: IconSettings },
] as const;

export function AppLayout(): JSX.Element {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [opened, { toggle, close }] = useDisclosure(false);

  return (
    <AppShell
      className="fondo-shell"
      header={{ height: 76 }}
      navbar={{ width: 272, breakpoint: "md", collapsed: { mobile: !opened } }}
      padding="xl"
    >
      <AppShell.Header className="fondo-header">
        <Group h="100%" px="xl" justify="space-between" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="md"
              size="sm"
              color="gray"
              aria-label={t("shell.toggleNavigation")}
            />
            <Text className="header-path" visibleFrom="md">
              {pathname === "/app/dashboard"
                ? t("navigation.dashboard")
                : t("navigation.workspace")}
            </Text>
          </Group>
          <Group gap="sm" wrap="nowrap">
            <Tooltip label={t("shell.searchComingSoon")} withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                aria-label={t("shell.searchComingSoon")}
              >
                <IconMenu2 size={19} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              aria-label={t("shell.notifications")}
            >
              <IconBell size={20} stroke={1.5} />
            </ActionIcon>
            <Menu shadow="md" width={190} position="bottom-end">
              <Menu.Target>
                <UnstyledUserButton label={t("shell.userMenu")} />
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t("shell.personalSpace")}</Menu.Label>
                <Menu.Item
                  leftSection={<IconSettings size={15} />}
                  component={RouterLink}
                  to="/app/settings"
                >
                  {t("navigation.settings")}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={15} />}>
                  {t("shell.signOut")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="fondo-navbar" p="lg">
        <AppShell.Section>
          <Group justify="space-between" px="xs" mb={34}>
            <FondoBrand label={t("brand.name")} size="lg" />
            <Badge variant="light" color="signal" size="xs">
              {t("brand.version")}
            </Badge>
          </Group>
          <Stack gap={4}>
            <Text className="eyebrow" px="xs" size="xs">
              {t("shell.overview")}
            </Text>
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                component={RouterLink}
                to={item.to}
                label={t(item.labelKey)}
                leftSection={<item.icon size={18} stroke={1.7} />}
                active={pathname.startsWith(item.to)}
                onClick={close}
                className="fondo-nav-link"
              />
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea} mt="xl">
          <Text className="eyebrow" px="xs" size="xs" mb="xs">
            {t("shell.yourServices")}
          </Text>
          <NavLink
            component={RouterLink}
            to="/app/services"
            label={t("services.title")}
            description={t("services.activeCount")}
            leftSection={<IconStack2 size={18} stroke={1.7} />}
            rightSection={<IconChevronRight size={15} />}
            active={pathname.startsWith("/app/services")}
            onClick={close}
            className="fondo-nav-link"
          />
          <Divider my="lg" />
          <Stack className="sidebar-promo" gap="sm" p="md">
            <ThemeIcon color="signal" variant="light" size={34} radius="md">
              <IconSparkles size={17} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              {t("shell.promoTitle")}
            </Text>
            <Text c="dimmed" size="xs" lh={1.5}>
              {t("shell.promoDescription")}
            </Text>
            <Button
              component={RouterLink}
              to="/app/services"
              variant="light"
              color="signal"
              size="xs"
              mt={4}
              onClick={close}
            >
              {t("shell.exploreServices")}
            </Button>
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Group className="sidebar-account" gap="sm" wrap="nowrap">
            <Avatar color="signal" radius="md" size="md">
              AR
            </Avatar>
            <Stack gap={1} style={{ flex: 1 }}>
              <Text size="sm" fw={700} truncate>
                {t("shell.demoUser")}
              </Text>
              <Text size="xs" c="dimmed">
                {t("shell.demoPlan")}
              </Text>
            </Stack>
            <IconCreditCard size={16} className="text-muted" />
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <ScrollArea.Autosize
          mah="calc(100vh - 76px)"
          type="scroll"
          offsetScrollbars
        >
          <div className="fondo-page">
            <Outlet />
          </div>
        </ScrollArea.Autosize>
      </AppShell.Main>
    </AppShell>
  );
}

function UnstyledUserButton({
  label,
}: {
  readonly label: string;
}): JSX.Element {
  return (
    <Button
      className="user-button"
      variant="subtle"
      color="gray"
      p={4}
      aria-label={label}
    >
      <Avatar color="signal" radius="md" size={34}>
        AR
      </Avatar>
    </Button>
  );
}
