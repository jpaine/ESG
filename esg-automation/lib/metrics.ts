/**
 * Metrics and analytics utility
 * Tracks API usage, performance, and errors for monitoring
 */

import { log } from './logger';

export interface MetricEvent {
  type: 'api_request' | 'api_success' | 'api_error' | 'llm_call' | 'file_processing';
  endpoint?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// In-memory metrics store (for serverless, consider external service)
// In production, this should be sent to an analytics service
const metricsStore: MetricEvent[] = [];

// Maximum events to keep in memory (prevent memory leaks)
const MAX_METRICS = 1000;

/**
 * Record a metric event
 */
export function recordMetric(event: Omit<MetricEvent, 'timestamp'>): void {
  const metric: MetricEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // Add to store
  metricsStore.push(metric);

  // Trim if too large
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.shift();
  }

  // Log for observability (in production, send to analytics service)
  log.info('[METRICS]', metric);
}

/**
 * Record API request
 */
export function recordAPIRequest(
  endpoint: string,
  requestId: string,
  metadata?: Record<string, any>
): void {
  recordMetric({
    type: 'api_request',
    endpoint,
    requestId,
    metadata,
  });
}

/**
 * Record API success
 */
export function recordAPISuccess(
  endpoint: string,
  requestId: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  recordMetric({
    type: 'api_success',
    endpoint,
    requestId,
    duration,
    metadata,
  });
}

/**
 * Record API error
 */
export function recordAPIError(
  endpoint: string,
  requestId: string,
  statusCode: number,
  errorCode: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  recordMetric({
    type: 'api_error',
    endpoint,
    requestId,
    statusCode,
    errorCode,
    duration,
    metadata,
  });
}

/**
 * Record LLM call
 */
export function recordLLMCall(
  provider: string,
  duration: number,
  tokensUsed?: number,
  metadata?: Record<string, any>
): void {
  recordMetric({
    type: 'llm_call',
    metadata: {
      provider,
      tokensUsed,
      ...metadata,
    },
    duration,
  });
}

/**
 * Record file processing
 */
export function recordFileProcessing(
  fileName: string,
  fileType: string,
  duration: number,
  success: boolean,
  metadata?: Record<string, any>
): void {
  recordMetric({
    type: 'file_processing',
    metadata: {
      fileName,
      fileType,
      success,
      ...metadata,
    },
    duration,
  });
}

/**
 * Get metrics summary (for health check or monitoring)
 */
export function getMetricsSummary(): {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  errorRate: number;
  recentErrors: MetricEvent[];
} {
  const requests = metricsStore.filter(m => m.type === 'api_request');
  const successes = metricsStore.filter(m => m.type === 'api_success');
  const errors = metricsStore.filter(m => m.type === 'api_error');
  
  const totalRequests = requests.length;
  const totalErrors = errors.length;
  
  const successfulDurations = successes
    .filter(s => s.duration !== undefined)
    .map(s => s.duration!);
  
  const averageResponseTime = successfulDurations.length > 0
    ? successfulDurations.reduce((sum, d) => sum + d, 0) / successfulDurations.length
    : 0;
  
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  
  // Get last 10 errors
  const recentErrors = errors.slice(-10).reverse();
  
  return {
    totalRequests,
    totalErrors,
    averageResponseTime: Math.round(averageResponseTime),
    errorRate: Math.round(errorRate * 100) / 100,
    recentErrors,
  };
}

/**
 * Clear metrics (useful for testing or periodic cleanup)
 */
export function clearMetrics(): void {
  metricsStore.length = 0;
}

