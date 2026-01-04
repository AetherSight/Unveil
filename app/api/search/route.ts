import { NextRequest, NextResponse } from 'next/server';
import { getNextRevelationUrl } from '@/lib/revelation-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    if (!q || q.trim() === '') {
      return NextResponse.json(
        { message: '缺少搜索关键词', results: [] },
        { status: 400 }
      );
    }

    // 使用轮询获取下一个可用的服务地址
    const revelationUrl = getNextRevelationUrl();
    const url = new URL(`${revelationUrl}/search`);
    url.searchParams.set('q', q.trim());
    url.searchParams.set('limit', limit.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return NextResponse.json(
        { message: error.message || error.detail || '搜索失败', results: [] },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    let errorMessage = '搜索失败';
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = '无法连接到后端服务，请确认服务是否已启动';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { message: errorMessage, results: [] },
      { status: 500 }
    );
  }
}





