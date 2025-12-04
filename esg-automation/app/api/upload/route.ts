import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile } from '@/lib/document-processor';
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { formatErrorResponse, FileProcessingError, ValidationError, RateLimitError, TimeoutError } from '@/lib/errors';
import { generateRequestId, sanitizeFileName } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { withTimeout } from '@/lib/timeout';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId('upload');
  
  log.api('Upload request started', requestId);
  
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
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      const error = new ValidationError('No file provided in request', undefined, requestId);
      console.error(`[API ERROR] ${requestId}:`, error);
      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: error.statusCode }
      );
    }

    // Sanitize file name
    const sanitizedFileName = sanitizeFileName(file.name);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const error = new ValidationError(
        `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB. Please upload a smaller file.`,
        {
          fileName: sanitizedFileName,
          fileSize: file.size,
          maxSize: MAX_FILE_SIZE,
        },
        requestId
      );
      console.error(`[API ERROR] ${requestId}:`, error);
      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: 413 }
      );
    }

    const fileInfo = {
      name: sanitizedFileName,
      originalName: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
    };
    
    log.api('Processing file upload', requestId, fileInfo);

    try {
      // Wrap extraction in timeout
      const extracted = await withTimeout(
        extractTextFromFile(file),
        120000, // 2 minutes for file processing
        'File processing timed out'
      );
      const processingTime = Date.now() - startTime;
      
      log.api('File extraction completed', requestId, {
        ...fileInfo,
        extractedTextLength: extracted.text?.length || 0,
        metadata: extracted.metadata,
        processingTime,
      });

      if (!extracted.text || extracted.text.trim().length === 0) {
        const error = new FileProcessingError(
          'No text could be extracted from the file. The file may be empty, corrupted, or in an unsupported format.',
          {
            metadata: extracted.metadata,
            processingTime,
          },
          requestId
        );
        log.apiError('Empty extraction result', requestId, { metadata: extracted.metadata });
        
        return NextResponse.json(
          formatErrorResponse(error, requestId),
          { status: error.statusCode }
        );
      }

      return NextResponse.json({
        text: extracted.text,
        metadata: extracted.metadata,
        fileName: sanitizedFileName,
        requestId,
      });
    } catch (extractionError) {
      const processingTime = Date.now() - startTime;
      const error = extractionError instanceof FileProcessingError || extractionError instanceof TimeoutError
        ? extractionError
        : new FileProcessingError(
            extractionError instanceof Error ? extractionError.message : 'Failed to process file',
            { processingTime },
            requestId
          );
      
      log.apiError('File extraction failed', requestId, { error: error.message, processingTime });
      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: error.statusCode }
      );
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const appError = error instanceof FileProcessingError || error instanceof ValidationError || error instanceof TimeoutError
      ? error
      : new FileProcessingError(
          error instanceof Error ? error.message : 'Failed to process file',
          { processingTime },
          requestId
        );
    
    log.apiError('Upload request failed', requestId, { error: appError.message, processingTime });
    return NextResponse.json(
      formatErrorResponse(appError, requestId),
      { status: appError.statusCode }
    );
  }
}

