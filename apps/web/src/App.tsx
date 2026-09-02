import {
  AppShell,
  Container,
  Group,
  MantineProvider,
  Text,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import type { JSX } from "react";

import { FondoBrand } from "@fondo/ui";

export function App(): JSX.Element {
  const { t } = useTranslation();

  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications />
      <AppShell header={{ height: 64 }} padding="md">
        <AppShell.Header>
          <Container size="xl" h="100%">
            <Group h="100%" justify="space-between">
              <FondoBrand size="lg" />
              <Text c="dimmed" size="sm">
                {t("app.foundation")}
              </Text>
            </Group>
          </Container>
        </AppShell.Header>
        <AppShell.Main>
          <Container size="xl">
            <Text component="h1" size="xl" fw={700}>
              {t("app.title")}
            </Text>
            <Text c="dimmed" mt="xs">
              {t("app.description")}
            </Text>
          </Container>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}
