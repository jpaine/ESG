import { NextRequest, NextResponse } from 'next/server';
import { generateIMDocument } from '@/lib/document-generator';
import { IMResult } from '@/lib/types';
import { formatErrorResponse, ValidationError } from '@/lib/errors';
import { generateRequestId } from '@/lib/utils';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId('download-im');
  
  try {
    const { imResult } = await request.json();

    if (!imResult) {
      const error = new ValidationError('IM result is required', undefined, requestId);
      log.apiError('Missing IM result', requestId);
      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: error.statusCode }
      );
    }

    log.api('Generating IM document', requestId);
    const buffer = await generateIMDocument(imResult as IMResult);
    log.api('IM document generated successfully', requestId, { size: buffer.length });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="ESG_Investment_Memo.docx"',
      },
    });
  } catch (error) {
    log.apiError('IM document generation failed', requestId, {
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

