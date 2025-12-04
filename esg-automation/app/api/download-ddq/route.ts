import { NextRequest, NextResponse } from 'next/server';
import { generateDDQDocument } from '@/lib/document-generator';
import { DDQResult } from '@/lib/types';
import { formatErrorResponse, ValidationError } from '@/lib/errors';
import { generateRequestId } from '@/lib/utils';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId('download-ddq');
  
  try {
    const { ddqResult } = await request.json();

    if (!ddqResult) {
      const error = new ValidationError('DDQ result is required', undefined, requestId);
      log.apiError('Missing DDQ result', requestId);
      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: error.statusCode }
      );
    }

    log.api('Generating DDQ document', requestId);
    const buffer = await generateDDQDocument(ddqResult as DDQResult);
    log.api('DDQ document generated successfully', requestId, { size: buffer.length });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="ESG_DDQ.docx"',
      },
    });
  } catch (error) {
    log.apiError('DDQ document generation failed', requestId, {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      formatErrorResponse(
        error instanceof Error ? error : new Error('Failed to generate document'),
        requestId
      ),
      { status: 500 }
    );
  }
}

