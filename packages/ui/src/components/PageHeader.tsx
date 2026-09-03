import { Group, Stack, Text, Title } from "@mantine/core";

export interface PageHeaderProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly rightSection?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  rightSection,
}: PageHeaderProps): React.JSX.Element {
  return (
    <Group
      className="page-header"
      justify="space-between"
      align="flex-end"
      gap="xl"
    >
      <Stack gap={6}>
        <Text className="eyebrow" size="xs">
          {eyebrow}
        </Text>
        <Title order={1} className="page-title">
          {title}
        </Title>
        <Text c="dimmed" maw={620}>
          {description}
        </Text>
      </Stack>
      {rightSection ? (
        <div className="page-header__actions">{rightSection}</div>
      ) : null}
    </Group>
  );
}
