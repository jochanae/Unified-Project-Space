// Shared rate limiting utility for edge functions
// In-memory rate limiting (per instance) - suitable for most use cases

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

interface RateLimitConfig {
  maxRequests: number;      // Maximum requests allowed in window
  windowMs: number;         // Time window in milliseconds
  keyPrefix?: string;       // Optional prefix for the key
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;          // Seconds until reset
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (user_id, IP, etc.)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with allowed status and metadata
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs, keyPrefix = '' } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();
  
  const record = rateLimitStore.get(key);
  
  // No existing record - create one
  if (!record) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetIn: Math.ceil(windowMs / 1000),
    };
  }
  
  // Check if window has expired
  if (now - record.windowStart >= windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetIn: Math.ceil(windowMs / 1000),
    };
  }
  
  // Within window - increment and check
  record.count++;
  const allowed = record.count <= maxRequests;
  const resetIn = Math.ceil((record.windowStart + windowMs - now) / 1000);
  
  return {
    allowed,
    remaining: Math.max(0, maxRequests - record.count),
    resetIn,
  };
}

/**
 * Reset rate limit for an identifier
 */
export function resetRateLimit(identifier: string, keyPrefix = ''): void {
  const key = `${keyPrefix}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Create a rate limit response with proper headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: result.resetIn,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': result.resetIn.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetIn.toString(),
      },
    }
  );
}

// Common rate limit configurations
export const RATE_LIMITS = {
  // AI endpoints - more restrictive (expensive operations)
  AI_INSIGHTS: { maxRequests: 10, windowMs: 60 * 1000, keyPrefix: 'ai-insights' },           // 10/min
  AI_COACH: { maxRequests: 20, windowMs: 60 * 1000, keyPrefix: 'ai-coach' },                 // 20/min
  BILL_OPTIMIZER: { maxRequests: 5, windowMs: 60 * 1000, keyPrefix: 'bill-optimizer' },      // 5/min
  VOICE_COMMAND: { maxRequests: 30, windowMs: 60 * 1000, keyPrefix: 'voice-command' },       // 30/min
  
  // Standard endpoints
  STANDARD: { maxRequests: 60, windowMs: 60 * 1000, keyPrefix: 'standard' },                  // 60/min
  
  // Auth endpoints - stricter
  AUTH: { maxRequests: 5, windowMs: 15 * 60 * 1000, keyPrefix: 'auth' },                      // 5/15min
} as const;
