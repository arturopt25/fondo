const RATE_LIMIT_WINDOW_MS = 60_000;

function limitFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export const API_READ_THROTTLE = {
  default: {
    limit: limitFromEnv("API_READ_RATE_LIMIT", 100),
    ttl: RATE_LIMIT_WINDOW_MS,
  },
};

export const API_WRITE_THROTTLE = {
  default: {
    limit: limitFromEnv("API_WRITE_RATE_LIMIT", 10),
    ttl: RATE_LIMIT_WINDOW_MS,
  },
};

export const API_UPLOAD_THROTTLE = {
  default: {
    limit: limitFromEnv("API_UPLOAD_RATE_LIMIT", 10),
    ttl: RATE_LIMIT_WINDOW_MS,
  },
};
