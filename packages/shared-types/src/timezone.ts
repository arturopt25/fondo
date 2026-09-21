import { z } from "zod";

export const supportedTimeZones: readonly string[] =
  Intl.supportedValuesOf("timeZone");

const allowedTimeZones = new Set(["UTC", ...supportedTimeZones]);

export const timeZoneSchema = z
  .string()
  .max(64)
  .refine((value) => allowedTimeZones.has(value), {
    message: "Unsupported IANA time zone",
  });