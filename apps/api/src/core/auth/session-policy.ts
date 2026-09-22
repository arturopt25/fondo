const seconds = (value: number): number => value;

export const sessionPolicy = {
  expiresIn: seconds(60 * 60 * 24 * 7),
  updateAge: seconds(60 * 60 * 24),
  absoluteMaxLifetime: seconds(60 * 60 * 24 * 30),
} as const;

export function isWithinAbsoluteSessionLifetime(
  createdAt: Date | string | number,
  now: Date = new Date(),
): boolean {
  const createdAtMs = new Date(createdAt).getTime();

  if (Number.isNaN(createdAtMs)) {
    return false;
  }

  const ageMs = now.getTime() - createdAtMs;

  return ageMs >= 0 && ageMs < sessionPolicy.absoluteMaxLifetime * 1000;
}
