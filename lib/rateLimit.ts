/**
 * In-memory sliding-window rate limiter.
 *
 * Uses a module-level Map so the state is shared across all requests
 * within the same Node.js server process. Works with Next.js Route Handlers
 * running on the Node.js runtime (not Edge).
 *
 * On serverless platforms each instance is independent — this provides
 * per-instance limiting which is still a strong deterrent against brute-force.
 * For multi-instance production, swap the Map for an Upstash Redis store.
 */

interface RateLimitEntry {
  /** Timestamps (ms) of requests within the current window. */
  timestamps: number[];
}

// Global store — persists for the lifetime of the server process.
const store = new Map<string, RateLimitEntry>();

// Prune entries older than the longest window every N calls to avoid memory leaks.
const PRUNE_INTERVAL = 500;
let pruneCounter = 0;

function pruneExpired(windowMs: number) {
  const cutoff = Date.now() - windowMs;
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t: number) => t > cutoff);
    if (entry.timestamps.length === 0) keysToDelete.push(key);
  });
  keysToDelete.forEach(key => store.delete(key));
}

export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Unix timestamp (ms) when the oldest request in the window expires. */
  resetAt: number;
  /** How many ms until the window resets (for Retry-After header). */
  retryAfterMs: number;
}

export interface RateLimitOptions {
  /** Key to bucket by — typically an IP address or user identifier. */
  key: string;
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Sliding window duration in milliseconds. */
  windowMs: number;
}

/**
 * Check and record a request against the rate limit.
 *
 * @example
 * const result = rateLimit({ key: ip, limit: 10, windowMs: 60_000 });
 * if (!result.allowed) return new Response('Too many requests', { status: 429 });
 */
export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Periodic housekeeping
  pruneCounter++;
  if (pruneCounter >= PRUNE_INTERVAL) {
    pruneCounter = 0;
    pruneExpired(windowMs);
  }

  const entry = store.get(key) ?? { timestamps: [] };

  // Drop timestamps outside the current window
  entry.timestamps = entry.timestamps.filter(t => t > cutoff);

  const allowed = entry.timestamps.length < limit;

  if (allowed) {
    entry.timestamps.push(now);
  }

  store.set(key, entry);

  const oldest = entry.timestamps[0] ?? now;
  const resetAt = oldest + windowMs;
  const retryAfterMs = Math.max(0, resetAt - now);
  const remaining = Math.max(0, limit - entry.timestamps.length);

  return { allowed, remaining, resetAt, retryAfterMs };
}

/**
 * Extract the client IP address from standard proxy headers on a Next.js Request.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Build standard rate-limit response headers for a given limit check result.
 */
export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
  };
}
