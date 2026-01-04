import { NextRequest, NextResponse } from 'next/server';

const REVELATION_API = process.env.REVELATION_API || 'http://localhost:5000';

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

    const url = new URL(`${REVELATION_API}/search`);
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
      errorMessage = `无法连接到后端服务 (${REVELATION_API})，请确认服务是否已启动`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { message: errorMessage, results: [] },
      { status: 500 }
    );
  }
}


