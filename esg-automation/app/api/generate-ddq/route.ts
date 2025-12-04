import { NextRequest, NextResponse } from 'next/server';
import { generateDDQ } from '@/lib/ddq-generator';
import { CompanyInfo } from '@/lib/types';
import { formatErrorResponse, ValidationError, LLMError, AuthenticationError, RateLimitError, TimeoutError } from '@/lib/errors';
import { generateRequestId, sanitizeText } from '@/lib/utils';
import { MAX_TEXT_LENGTH, API_TIMEOUT_MS } from '@/lib/constants';
import { checkRateLimit } from '@/lib/rate-limit';
import { withTimeout } from '@/lib/timeout';
import { log } from '@/lib/logger';
import { recordAPIRequest, recordAPISuccess, recordAPIError } from '@/lib/metrics';
import { isFeatureEnabled } from '@/lib/feature-flags';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId('ddq');
  const startTime = Date.now();
  
  log.api('DDQ generation request started', requestId);
  
  // Record API request
  if (isFeatureEnabled('enableMetrics')) {
    recordAPIRequest('/api/generate-ddq', requestId);
  }
  
  // Check rate limit
  try {
    if (isFeatureEnabled('enableRateLimiting')) {
      checkRateLimit(request);
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      const duration = Date.now() - startTime;
      if (isFeatureEnabled('enableMetrics')) {
        recordAPIError('/api/generate-ddq', requestId, error.statusCode, error.code || 'RATE_LIMIT_EXCEEDED', duration);
      }
      log.apiError('Rate limit exceeded', requestId);
      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { 
          status: error.statusCode,
          headers: {
            'Retry-After': '60',
          },
        }
      );
    }
    throw error;
  }
  
  // Validate environment variables
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    const error = new AuthenticationError('API key not configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.', requestId);
    log.apiError('Missing API key', requestId);
    return NextResponse.json(
      formatErrorResponse(error, requestId),
      { status: error.statusCode }
    );
  }

  try {
    const { companyInfo, extractedText } = await request.json();

    if (!companyInfo) {
      const error = new ValidationError('Company information is required', undefined, requestId);
      log.apiError('Missing company info', requestId);
      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: error.statusCode }
      );
    }

    // Sanitize extracted text if provided
    const sanitizedText = extractedText ? sanitizeText(extractedText, MAX_TEXT_LENGTH) : undefined;

    // Wrap DDQ generation in timeout
    const ddqResult = await withTimeout(
      generateDDQ(companyInfo as CompanyInfo, sanitizedText),
      API_TIMEOUT_MS,
      'DDQ generation timed out'
    );

    const processingTime = Date.now() - startTime;
    log.api('DDQ generation completed', requestId, { processingTime });
    
    // Record success
    if (isFeatureEnabled('enableMetrics')) {
      recordAPISuccess('/api/generate-ddq', requestId, processingTime, {
        riskManagementItems: ddqResult.riskManagement.length,
        environmentItems: ddqResult.environment.length,
        socialItems: ddqResult.social.length,
        governanceItems: ddqResult.governance.length,
      });
    }

    return NextResponse.json({
      ...ddqResult,
      requestId,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const appError = error instanceof LLMError || error instanceof ValidationError || error instanceof TimeoutError
      ? error
      : new LLMError(
          error instanceof Error ? error.message : 'Failed to generate DDQ',
          undefined,
          { processingTime },
          requestId
        );
    
    // Record error
    if (isFeatureEnabled('enableMetrics')) {
      recordAPIError('/api/generate-ddq', requestId, appError.statusCode, appError.code || 'LLM_ERROR', processingTime);
    }
    
    log.apiError('DDQ generation failed', requestId, { error: appError.message, processingTime });
    return NextResponse.json(
      formatErrorResponse(appError, requestId),
      { status: appError.statusCode }
    );
  }
}

