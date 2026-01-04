import { NextRequest, NextResponse } from 'next/server';
import { getAllDissectorUrls } from '@/lib/dissector-client';
import { getAllRevelationUrls } from '@/lib/revelation-client';

export async function GET(request: NextRequest) {
  const service = request.nextUrl.searchParams.get('service');

  if (service !== 'dissector' && service !== 'revelation') {
    return NextResponse.json(
      { message: 'Invalid service parameter. Use "dissector" or "revelation"' },
      { status: 400 }
    );
  }

  // 获取第一个可用的服务地址进行健康检查
  const urls = service === 'dissector' ? getAllDissectorUrls() : getAllRevelationUrls();
  const baseUrl = urls.length > 0 ? urls[0] : (service === 'dissector' ? 'http://localhost:8000' : 'http://localhost:5000');

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

