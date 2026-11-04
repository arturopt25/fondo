export const DEFAULT_HEALTH_DB_TIMEOUT_MS = 1000;

export function parseHealthDbTimeoutMs(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_HEALTH_DB_TIMEOUT_MS;
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return DEFAULT_HEALTH_DB_TIMEOUT_MS;
  }

  const value = Number(trimmed);
  if (!Number.isInteger(value) || value <= 0) {
    return DEFAULT_HEALTH_DB_TIMEOUT_MS;
  }

  return value;
}
