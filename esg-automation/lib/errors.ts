/**
 * Standardized error handling utilities
 * Provides consistent error types and formatting across the application
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public requestId?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>, requestId?: string) {
    super(message, 400, 'VALIDATION_ERROR', requestId, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', requestId?: string) {
    super(message, 401, 'AUTHENTICATION_ERROR', requestId);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', requestId?: string) {
    super(message, 404, 'NOT_FOUND', requestId);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', requestId?: string) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', requestId);
  }
}

export class FileProcessingError extends AppError {
  constructor(message: string, details?: Record<string, any>, requestId?: string) {
    super(message, 422, 'FILE_PROCESSING_ERROR', requestId, details);
  }
}

export class LLMError extends AppError {
  constructor(
    message: string,
    public provider?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, 500, 'LLM_ERROR', requestId, { provider, ...details });
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'Request timeout', requestId?: string) {
    super(message, 504, 'TIMEOUT_ERROR', requestId);
  }
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown, requestId?: string): {
  error: string;
  code?: string;
  requestId?: string;
  details?: Record<string, any>;
} {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      requestId: error.requestId || requestId,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'INTERNAL_ERROR',
      requestId,
    };
  }

  return {
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    requestId,
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    // Don't retry client errors (4xx) except rate limits
    if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
      return false;
    }
    // Retry server errors (5xx) and rate limits
    return error.statusCode >= 500 || error.statusCode === 429;
  }

  if (error instanceof Error) {
    // Retry network errors and timeouts
    return (
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('network')
    );
  }

  return false;
}

