// Simple in-memory IP-based rate limiter for auth endpoints.
// Resets on server restart — acceptable for v0.1 single-instance deploy.
// Replace with Redis-backed limiter (Upstash / Vercel KV) in v0.2.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

// Opt-in escape hatch for E2E runs. Behind a real proxy each client has its own
// x-forwarded-for, so the limiter works per-IP; but local/E2E traffic all
// resolves to a single "unknown" bucket and would lock the whole suite out
// after 10 logins. Defaults OFF — production stays rate-limited.
const DISABLED = process.env.DISABLE_AUTH_RATE_LIMIT === "1";

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  if (DISABLED) return { allowed: true, remaining: MAX_ATTEMPTS };

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

// Periodic cleanup to avoid unbounded memory growth (every 30 min)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [ip, entry] of store.entries()) {
        if (now > entry.resetAt) store.delete(ip);
      }
    },
    30 * 60 * 1000,
  );
}
