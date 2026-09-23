import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";

export interface ServiceCardProps {
  readonly name: string;
  readonly description: string;
  readonly status: string;
  readonly statusColor: string;
  readonly icon: TablerIcon;
  readonly actionLabel: string;
  readonly disabled?: boolean;
  readonly onAction?: () => void;
  readonly onSettings?: () => void;
}

export function ServiceCard({
  name,
  description,
  status,
  statusColor,
  icon: Icon,
  actionLabel,
  disabled = false,
  onAction,
  onSettings,
}: ServiceCardProps): React.JSX.Element {
  return (
    <Card className="service-card" padding="lg" radius="lg" withBorder>
      <Group justify="space-between" align="flex-start">
        <ThemeIcon color="signal" variant="light" size={42} radius="md">
          <Icon size={21} stroke={1.6} />
        </ThemeIcon>
        <Group gap="xs" wrap="nowrap">
          {onSettings ? (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="service settings"
              onClick={onSettings}
            >
              <IconSettings size={16} stroke={1.6} />
            </ActionIcon>
          ) : null}
          <Badge color={statusColor} variant="light" size="sm">
            {status}
          </Badge>
        </Group>
      </Group>
      <Stack gap={7} mt="xl">
        <Title order={3} className="section-title">
          {name}
        </Title>
        <Text c="dimmed" size="sm" lh={1.6} mih={48}>
          {description}
        </Text>
      </Stack>
      <Button
        variant={disabled ? "light" : "default"}
        color={disabled ? "gray" : "signal"}
        fullWidth
        mt="xl"
        disabled={disabled}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </Card>
  );
}
