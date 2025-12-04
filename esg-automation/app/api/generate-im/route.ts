import { NextRequest, NextResponse } from 'next/server';
import { generateIM } from '@/lib/im-generator';
import { CompanyInfo, DDQResult } from '@/lib/types';
import { formatErrorResponse, ValidationError, LLMError, AuthenticationError, RateLimitError, TimeoutError } from '@/lib/errors';
import { generateRequestId, sanitizeText } from '@/lib/utils';
import { MAX_TEXT_LENGTH, API_TIMEOUT_MS } from '@/lib/constants';
import { checkRateLimit } from '@/lib/rate-limit';
import { withTimeout } from '@/lib/timeout';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId('im');
  const startTime = Date.now();
  
  log.api('IM generation request started', requestId);
  
  // Check rate limit
  try {
    checkRateLimit(request);
  } catch (error) {
    if (error instanceof RateLimitError) {
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
    const { companyInfo, ddqResult, extractedText } = await request.json();

    if (!companyInfo || !ddqResult) {
      const error = new ValidationError('Company information and DDQ results are required', undefined, requestId);
      log.apiError('Missing required data', requestId);
      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: error.statusCode }
      );
    }

    // Sanitize extracted text if provided
    const sanitizedText = extractedText ? sanitizeText(extractedText, MAX_TEXT_LENGTH) : undefined;

    // Wrap IM generation in timeout
    const imResult = await withTimeout(
      generateIM(
        companyInfo as CompanyInfo,
        ddqResult as DDQResult,
        sanitizedText
      ),
      API_TIMEOUT_MS,
      'IM generation timed out'
    );

    const processingTime = Date.now() - startTime;
    log.api('IM generation completed', requestId, { processingTime });

    return NextResponse.json({
      ...imResult,
      requestId,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const appError = error instanceof LLMError || error instanceof ValidationError || error instanceof TimeoutError
      ? error
      : new LLMError(
          error instanceof Error ? error.message : 'Failed to generate IM',
          undefined,
          { processingTime },
          requestId
        );
    
    log.apiError('IM generation failed', requestId, { error: appError.message, processingTime });
    return NextResponse.json(
      formatErrorResponse(appError, requestId),
      { status: appError.statusCode }
    );
  }
}

