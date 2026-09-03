import { Center, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";

export interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
}

export function EmptyState({
  title,
  description,
}: EmptyStateProps): React.JSX.Element {
  return (
    <Center py={48}>
      <Stack align="center" gap="sm" maw={360} ta="center">
        <ThemeIcon variant="light" color="signal" size={46} radius="xl">
          <IconInbox size={22} stroke={1.5} />
        </ThemeIcon>
        <Title order={4}>{title}</Title>
        <Text c="dimmed" size="sm">
          {description}
        </Text>
      </Stack>
    </Center>
  );
}
