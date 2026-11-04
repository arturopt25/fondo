const RATE_LIMIT_WINDOW_MS = 60_000;

interface ThrottlerRequest {
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly ip?: string;
}

/**
 * Resolve the real client IP behind Cloudflare and Render. Without this, every
 * request shares the proxy socket IP and the global rate limit becomes one
 * bucket for all users.
 */
export function clientIpTracker(request: ThrottlerRequest): string {
  const cloudflareIp = request.headers?.["cf-connecting-ip"];
  if (typeof cloudflareIp === "string" && cloudflareIp.trim().length > 0) {
    return cloudflareIp.trim();
  }

  const forwarded = request.headers?.["x-forwarded-for"];
  const rawForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof rawForwarded === "string") {
    const first = rawForwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return request.ip ?? "unknown";
}

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
