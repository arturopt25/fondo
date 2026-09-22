export const DAY = 24 * 60 * 60;

export const sessionPolicy = {
  expiresIn: 7 * DAY,
  updateAge: DAY,
  absoluteMaxLifetime: 30 * DAY,
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
