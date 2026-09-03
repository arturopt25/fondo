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
import {
  Link as RouterLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { JSX } from "react";

import { FondoBrand } from "@fondo/ui";
import { useAuth } from "../../modules/auth/auth-context";

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
  const navigate = useNavigate();
  const [opened, { toggle, close }] = useDisclosure(false);
  const { session, signOut } = useAuth();

  const userName = session?.user.name ?? "Fondo";
  const userInitials = userName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSignOut(): Promise<void> {
    await signOut();
    navigate("/login", { replace: true });
  }

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
                <UnstyledUserButton
                  label={t("shell.userMenu")}
                  initials={userInitials}
                  image={session?.user.image ?? null}
                />
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  {session?.user.email ?? t("shell.personalSpace")}
                </Menu.Label>
                <Menu.Item
                  leftSection={<IconSettings size={15} />}
                  component={RouterLink}
                  to="/app/settings"
                  onClick={close}
                >
                  {t("navigation.settings")}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={15} />}
                  onClick={() => void handleSignOut()}
                >
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
              {userInitials || "F"}
            </Avatar>
            <Stack gap={1} style={{ flex: 1 }}>
              <Text size="sm" fw={700} truncate>
                {userName}
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
  initials,
  image,
}: {
  readonly label: string;
  readonly initials: string;
  readonly image: string | null;
}): JSX.Element {
  return (
    <Button
      className="user-button"
      variant="subtle"
      color="gray"
      p={4}
      aria-label={label}
    >
      <Avatar
        color="signal"
        radius="md"
        size={34}
        {...(image ? { src: image } : {})}
      >
        {initials || "F"}
      </Avatar>
    </Button>
  );
}
