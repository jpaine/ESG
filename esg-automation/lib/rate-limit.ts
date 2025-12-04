/**
 * Rate limiting utility
 * 
 * Note: This is a simple in-memory rate limiter. For production at scale,
 * consider using Redis, Vercel Edge Config, or a dedicated rate limiting service.
 */

import { RATE_LIMIT_REQUESTS_PER_MINUTE, RATE_LIMIT_REQUESTS_PER_HOUR } from './constants';
import { RateLimitError } from './errors';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (resets on serverless function cold start)
// For production, this should use Redis or Vercel Edge Config
const rateLimitStore = new Map<string, {
  perMinute: RateLimitEntry;
  perHour: RateLimitEntry;
}>();

/**
 * Get client identifier from request
 */
function getClientId(request: Request | { headers: Headers | { get: (key: string) => string | null } }): string {
  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfConnectingIp = headers.get('cf-connecting-ip');
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  return ip;
}

/**
 * Clean up expired entries (simple cleanup)
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.perMinute.resetTime < now && value.perHour.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check rate limit for a request
 * @throws RateLimitError if limit exceeded
 */
export function checkRateLimit(request: Request | { headers: Headers | { get: (key: string) => string | null } }): void {
  const clientId = getClientId(request);
  const now = Date.now();
  
  // Cleanup every 100th request (simple optimization)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }
  
  let entry = rateLimitStore.get(clientId);
  
  if (!entry) {
    entry = {
      perMinute: { count: 0, resetTime: now + 60000 },
      perHour: { count: 0, resetTime: now + 3600000 },
    };
    rateLimitStore.set(clientId, entry);
  }
  
  // Check per-minute limit
  if (now >= entry.perMinute.resetTime) {
    entry.perMinute = { count: 0, resetTime: now + 60000 };
  }
  
  if (entry.perMinute.count >= RATE_LIMIT_REQUESTS_PER_MINUTE) {
    const resetIn = Math.ceil((entry.perMinute.resetTime - now) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded: ${RATE_LIMIT_REQUESTS_PER_MINUTE} requests per minute. Please try again in ${resetIn} seconds.`
    );
  }
  
  // Check per-hour limit
  if (now >= entry.perHour.resetTime) {
    entry.perHour = { count: 0, resetTime: now + 3600000 };
  }
  
  if (entry.perHour.count >= RATE_LIMIT_REQUESTS_PER_HOUR) {
    const resetIn = Math.ceil((entry.perHour.resetTime - now) / 3600000);
    throw new RateLimitError(
      `Rate limit exceeded: ${RATE_LIMIT_REQUESTS_PER_HOUR} requests per hour. Please try again in ${resetIn} hour(s).`
    );
  }
  
  // Increment counters
  entry.perMinute.count++;
  entry.perHour.count++;
}

/**
 * Rate limiting middleware wrapper for API routes
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      checkRateLimit(request);
      return await handler(request);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(
          JSON.stringify({
            error: error.message,
            code: error.code,
          }),
          {
            status: error.statusCode,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60', // Suggest retry after 60 seconds
            },
          }
        );
      }
      throw error;
    }
  };
}

