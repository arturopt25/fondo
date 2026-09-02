import { Text } from "@mantine/core";
import type { JSX } from "react";

export interface FondoBrandProps {
  readonly size?: "sm" | "md" | "lg";
}

export function FondoBrand({ size = "md" }: FondoBrandProps): JSX.Element {
  return (
    <Text fw={700} size={size} component="span">
      Fondo
    </Text>
  );
}
