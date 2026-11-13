import { createClient } from '@supabase/supabase-js';

/**
 * Sliding-window rate limiter.
 *
 * `rateLimitAsync` uses:
 *  1. Upstash Redis REST API (when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set),
 *  2. Supabase Postgres `check_rate_limit` RPC (when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set),
 *  3. In-memory sliding-window fallback (`rateLimit`) if neither external store is available or fails.
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
 * Persistent cross-instance sliding-window rate limiter.
 * Prefers Upstash Redis REST, then Supabase Postgres RPC (`check_rate_limit`),
 * and falls back to the in-memory limiter if unavailable.
 */
export async function rateLimitAsync(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowMs } = options;

  // 1. Upstash Redis REST sliding window (zero extra dependencies)
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) {
    try {
      const now = Date.now();
      const cutoff = now - windowMs;
      const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;
      const redisKey = `rl:${key}`;

      const pipelineRes = await fetch(`${upstashUrl.replace(/\/$/, '')}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['ZREMRANGEBYSCORE', redisKey, '0', String(cutoff)],
          ['ZCARD', redisKey],
          ['ZRANGE', redisKey, '0', '0', 'WITHSCORES'],
        ]),
        cache: 'no-store',
      });

      if (pipelineRes.ok) {
        const results = (await pipelineRes.json()) as Array<{ result?: unknown }>;
        const currentCount = Number(results?.[1]?.result ?? 0);
        const oldestArr = Array.isArray(results?.[2]?.result) ? (results[2].result as string[]) : [];
        const oldestScore = oldestArr.length >= 2 ? Number(oldestArr[1]) : now;
        const allowed = currentCount < limit;

        if (allowed) {
          await fetch(`${upstashUrl.replace(/\/$/, '')}/pipeline`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${upstashToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([
              ['ZADD', redisKey, String(now), member],
              ['PEXPIRE', redisKey, String(windowMs)],
            ]),
            cache: 'no-store',
          });
        }

        const effectiveCount = allowed ? currentCount + 1 : currentCount;
        const resetAt = (allowed && currentCount === 0 ? now : oldestScore) + windowMs;
        return {
          allowed,
          remaining: Math.max(0, limit - effectiveCount),
          resetAt,
          retryAfterMs: Math.max(0, resetAt - now),
        };
      }
    } catch {
      // Fall through to Supabase / in-memory fallback
    }
  }

  // 2. Supabase Postgres persistent sliding-window RPC
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey && serviceRoleKey !== 'your-service-role-key') {
    try {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await adminClient.rpc('check_rate_limit', {
        p_key: key,
        p_limit: limit,
        p_window_ms: windowMs,
      });

      const row = Array.isArray(data) ? data[0] : data;
      if (!error && row && typeof row.allowed === 'boolean') {
        return {
          allowed: row.allowed,
          remaining: Number(row.remaining ?? 0),
          resetAt: Number(row.reset_at ?? Date.now() + windowMs),
          retryAfterMs: Number(row.retry_after_ms ?? 0),
        };
      }
    } catch {
      // Fall through to in-memory fallback
    }
  }

  // 3. In-memory fallback
  return rateLimit(options);
}

/**
 * Extract the client IP address from standard proxy headers on a Next.js Request.
 */
export function getClientIp(req: Request): string {
  // Prioritize verified platform headers
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.trim();

  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[0];
    }
  }

  return 'unknown';
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
