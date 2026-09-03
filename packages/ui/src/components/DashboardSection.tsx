import { Card, Group, Stack, Text, Title } from "@mantine/core";

export interface DashboardSectionProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly action?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function DashboardSection({
  eyebrow,
  title,
  action,
  children,
  className,
}: DashboardSectionProps): React.JSX.Element {
  return (
    <Card
      className={
        className ? `dashboard-section ${className}` : "dashboard-section"
      }
      padding="lg"
      radius="lg"
      withBorder
    >
      <Group justify="space-between" align="flex-start" mb="lg">
        <Stack gap={4}>
          {eyebrow ? (
            <Text className="eyebrow" size="xs">
              {eyebrow}
            </Text>
          ) : null}
          <Title order={3} className="section-title">
            {title}
          </Title>
        </Stack>
        {action}
      </Group>
      {children}
    </Card>
  );
}
