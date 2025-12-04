/**
 * Timeout utility for async operations
 */

import { TimeoutError } from './errors';
import { API_TIMEOUT_MS } from './constants';

/**
 * Create a timeout promise that rejects after specified duration
 */
export function createTimeout(ms: number, message?: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(message || `Operation timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Wrap an async operation with a timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number = API_TIMEOUT_MS,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    operation,
    createTimeout(timeoutMs, errorMessage),
  ]);
}

/**
 * Create a cancellable timeout
 */
export function createCancellableTimeout(ms: number, callback: () => void): () => void {
  const timeoutId = setTimeout(callback, ms);
  return () => clearTimeout(timeoutId);
}

