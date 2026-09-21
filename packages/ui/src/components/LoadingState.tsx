import { Center, Loader, Stack, Text } from "@mantine/core";

export interface LoadingStateProps {
  readonly label?: string;
}

export function LoadingState({
  label = "Loading",
}: LoadingStateProps): React.JSX.Element {
  return (
    <Center py={48}>
      <Stack align="center" gap="sm">
        <Loader size="sm" color="signal" />
        <Text c="dimmed" size="sm">
          {label}
        </Text>
      </Stack>
    </Center>
  );
}