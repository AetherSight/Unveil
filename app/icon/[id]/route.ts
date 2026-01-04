import { NextRequest, NextResponse } from 'next/server';
import { getIcon } from '@/lib/icons';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { message: 'Missing icon ID' },
        { status: 400 }
      );
    }

    const iconBuffer = await getIcon(id);
    
    if (!iconBuffer) {
      return NextResponse.json(
        { message: 'Icon not found' },
        { status: 404 }
      );
    }

    const contentType = iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50
      ? 'image/png'
      : iconBuffer[0] === 0xFF && iconBuffer[1] === 0xD8
      ? 'image/jpeg'
      : 'image/png';

    return new NextResponse(iconBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Icon API error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load icon' },
      { status: 500 }
    );
  }
}



