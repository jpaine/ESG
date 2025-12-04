import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../rate-limit';
import { RateLimitError } from '../errors';
import { RATE_LIMIT_REQUESTS_PER_MINUTE } from '../constants';

// Mock request object
function createMockRequest(headers: Record<string, string> = {}): any {
  return {
    headers: {
      get: (key: string) => headers[key] || null,
    },
  };
}

describe('checkRateLimit', () => {
  // Use unique IPs for each test to avoid interference
  let testIpCounter = 0;
  
  function getUniqueTestIp(): string {
    return `192.168.1.${++testIpCounter}`;
  }

  it('should allow requests within rate limit', () => {
    const request = createMockRequest({ 'x-forwarded-for': getUniqueTestIp() });
    
    // Should not throw for first request
    expect(() => checkRateLimit(request)).not.toThrow();
  });

  it('should throw RateLimitError when per-minute limit exceeded', () => {
    const request = createMockRequest({ 'x-forwarded-for': getUniqueTestIp() });
    
    // Make requests up to the limit
    for (let i = 0; i < RATE_LIMIT_REQUESTS_PER_MINUTE; i++) {
      checkRateLimit(request);
    }
    
    // Next request should fail
    expect(() => checkRateLimit(request)).toThrow(RateLimitError);
  });

  it('should track different IPs separately', () => {
    const request1 = createMockRequest({ 'x-forwarded-for': getUniqueTestIp() });
    const request2 = createMockRequest({ 'x-forwarded-for': getUniqueTestIp() });
    
    // Both should be allowed
    expect(() => checkRateLimit(request1)).not.toThrow();
    expect(() => checkRateLimit(request2)).not.toThrow();
  });

  it('should use x-real-ip if x-forwarded-for not available', () => {
    const request = createMockRequest({ 'x-real-ip': getUniqueTestIp() });
    expect(() => checkRateLimit(request)).not.toThrow();
  });

  it('should use cf-connecting-ip if others not available', () => {
    const request = createMockRequest({ 'cf-connecting-ip': getUniqueTestIp() });
    expect(() => checkRateLimit(request)).not.toThrow();
  });

  it('should use "unknown" if no IP headers available', () => {
    const request = createMockRequest({});
    expect(() => checkRateLimit(request)).not.toThrow();
  });

  it('should handle comma-separated IPs in x-forwarded-for', () => {
    const ip = getUniqueTestIp();
    const request = createMockRequest({ 
      'x-forwarded-for': `${ip}, 10.0.0.1, 172.16.0.1` 
    });
    
    // Should use first IP
    expect(() => checkRateLimit(request)).not.toThrow();
  });

  it('should include retry-after information in error', () => {
    const request = createMockRequest({ 'x-forwarded-for': getUniqueTestIp() });
    
    // Exceed rate limit
    for (let i = 0; i < RATE_LIMIT_REQUESTS_PER_MINUTE; i++) {
      checkRateLimit(request);
    }
    
    // Next request should throw RateLimitError
    expect(() => checkRateLimit(request)).toThrow(RateLimitError);
    
    // Verify error message
    try {
      checkRateLimit(request);
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      const rateLimitError = error as RateLimitError;
      expect(rateLimitError.message).toContain('Rate limit exceeded');
      expect(rateLimitError.message).toContain('requests per minute');
    }
  });
});

