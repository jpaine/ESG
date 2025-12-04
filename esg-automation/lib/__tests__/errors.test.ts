import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  FileProcessingError,
  LLMError,
  TimeoutError,
  formatErrorResponse,
  isRetryableError,
} from '../errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with default status code', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
    });

    it('should create error with custom status code', () => {
      const error = new AppError('Test error', 404);
      expect(error.statusCode).toBe(404);
    });

    it('should include request ID and details', () => {
      const error = new AppError('Test error', 400, 'TEST_CODE', 'req-123', { field: 'value' });
      expect(error.requestId).toBe('req-123');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ field: 'value' });
    });
  });

  describe('ValidationError', () => {
    it('should have status code 400', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('AuthenticationError', () => {
    it('should have status code 401', () => {
      const error = new AuthenticationError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should have status code 404', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('RateLimitError', () => {
    it('should have status code 429', () => {
      const error = new RateLimitError();
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('FileProcessingError', () => {
    it('should have status code 422', () => {
      const error = new FileProcessingError('File error');
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('FILE_PROCESSING_ERROR');
    });
  });

  describe('LLMError', () => {
    it('should include provider in details', () => {
      const error = new LLMError('LLM error', 'openai');
      expect(error.provider).toBe('openai');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('LLM_ERROR');
    });
  });

  describe('TimeoutError', () => {
    it('should have status code 504', () => {
      const error = new TimeoutError();
      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('TIMEOUT_ERROR');
    });
  });
});

describe('formatErrorResponse', () => {
  it('should format AppError correctly', () => {
    const error = new ValidationError('Invalid input', { field: 'value' }, 'req-123');
    const response = formatErrorResponse(error, 'req-123');
    
    expect(response).toEqual({
      error: 'Invalid input',
      code: 'VALIDATION_ERROR',
      requestId: 'req-123',
      details: { field: 'value' },
    });
  });

  it('should format regular Error', () => {
    const error = new Error('Regular error');
    const response = formatErrorResponse(error, 'req-123');
    
    expect(response).toEqual({
      error: 'Regular error',
      code: 'INTERNAL_ERROR',
      requestId: 'req-123',
    });
  });

  it('should handle unknown error types', () => {
    const response = formatErrorResponse('string error', 'req-123');
    
    expect(response).toEqual({
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      requestId: 'req-123',
    });
  });
});

describe('isRetryableError', () => {
  it('should return false for client errors (4xx)', () => {
    const error = new ValidationError('Invalid input');
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return true for server errors (5xx)', () => {
    const error = new AppError('Server error', 500);
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for rate limit errors (429)', () => {
    const error = new RateLimitError();
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for network errors', () => {
    const error = new Error('ETIMEDOUT');
    expect(isRetryableError(error)).toBe(true);
    
    const error2 = new Error('ECONNRESET');
    expect(isRetryableError(error2)).toBe(true);
    
    const error3 = new Error('network error');
    expect(isRetryableError(error3)).toBe(true);
  });

  it('should return false for authentication errors', () => {
    const error = new AuthenticationError();
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return false for unknown error types', () => {
    expect(isRetryableError('string')).toBe(false);
    expect(isRetryableError(null)).toBe(false);
  });
});

