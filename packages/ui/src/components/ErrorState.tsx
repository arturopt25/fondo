import { Center, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export interface ErrorStateProps {
  readonly title?: string;
  readonly description?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "The data could not be loaded. Try again in a moment.",
}: ErrorStateProps): React.JSX.Element {
  return (
    <Center py={48}>
      <Stack align="center" gap="sm" maw={360} ta="center">
        <ThemeIcon variant="light" color="red" size={46} radius="xl">
          <IconAlertTriangle size={22} stroke={1.5} />
        </ThemeIcon>
        <Title order={4}>{title}</Title>
        <Text c="dimmed" size="sm">
          {description}
        </Text>
      </Stack>
    </Center>
  );
}