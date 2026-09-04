import { Loader, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

export function AuthLoadingState(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Stack align="center" justify="center" mih="60vh" gap="sm">
      <Loader color="signal" size="sm" aria-label={t("auth.loadingSession")} />
      <Text c="dimmed" size="sm">
        {t("auth.loadingSession")}
      </Text>
    </Stack>
  );
}
