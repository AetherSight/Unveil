import { NextRequest, NextResponse } from 'next/server';
import { getNextLexiconUrl } from '@/lib/lexicon-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const equipmentId = resolvedParams.id?.trim();

    if (!equipmentId) {
      return NextResponse.json(
        { message: 'Missing equipment ID', results: [] },
        { status: 400 }
      );
    }

    const lexiconUrl = getNextLexiconUrl();
    const url = new URL(`${lexiconUrl}/equipment/${equipmentId}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return NextResponse.json(
        { message: error.message || error.detail || 'Failed to fetch equipment detail', results: [] },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Equipment detail API error:', error);
    let errorMessage = 'Failed to fetch equipment detail';
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = 'Unable to connect to backend service';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { message: errorMessage, results: [] },
      { status: 500 }
    );
  }
}
