interface WindowEntry {
  count: number;
  windowStart: number;
}

interface RateLimitRule {
  maxRequests: number;
  windowMs: number;
}

const store = new Map<string, WindowEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > 120_000) store.delete(key);
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  ip: string,
  route: string,
  rule: RateLimitRule
): { allowed: boolean; remaining: number; resetMs: number } {
  const key = `${route}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= rule.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: rule.maxRequests - 1,
      resetMs: rule.windowMs,
    };
  }

  if (entry.count >= rule.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: rule.windowMs - (now - entry.windowStart),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: rule.maxRequests - entry.count,
    resetMs: rule.windowMs - (now - entry.windowStart),
  };
}

export const DASHBOARD_RATE_LIMIT: RateLimitRule = {
  maxRequests: 60,
  windowMs: 60_000,
};
