import { Card, Center, Group, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { FondoBrand } from "@fondo/ui";

interface AuthLayoutProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
}

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
}: AuthLayoutProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Center mih="100vh" className="auth-page">
      <div className="auth-page__glow" aria-hidden="true" />
      <Stack className="auth-card-wrap" gap="lg" w="100%" maw={420}>
        <Group justify="space-between" px="xs">
          <FondoBrand label={t("brand.name")} size="lg" />
          <Text className="eyebrow" size="xs">
            {t("brand.version")}
          </Text>
        </Group>
        <Card className="auth-card" padding="xl" radius="lg" withBorder>
          <Stack gap={6} mb="lg">
            <Text className="eyebrow" size="xs">
              {eyebrow}
            </Text>
            <Title order={2} className="section-title">
              {title}
            </Title>
            <Text c="dimmed" size="sm">
              {description}
            </Text>
          </Stack>
          {children}
        </Card>
      </Stack>
    </Center>
  );
}
