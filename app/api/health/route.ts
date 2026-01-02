import { NextRequest, NextResponse } from 'next/server';

const DISSECTOR_API = process.env.DISSECTOR_API || 'http://localhost:8000';
const REVELATION_API = process.env.REVELATION_API || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  const service = request.nextUrl.searchParams.get('service');

  if (service !== 'dissector' && service !== 'revelation') {
    return NextResponse.json(
      { message: 'Invalid service parameter. Use "dissector" or "revelation"' },
      { status: 400 }
    );
  }

  const baseUrl = service === 'dissector' ? DISSECTOR_API : REVELATION_API;

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json({ healthy: response.ok });
  } catch (error) {
    return NextResponse.json({ healthy: false }, { status: 503 });
  }
}

