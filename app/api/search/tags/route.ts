import { NextRequest, NextResponse } from 'next/server';
import { getNextLexiconUrl } from '@/lib/lexicon-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tagsParams = searchParams.getAll('tags');

    if (tagsParams.length > 0) {
      const lexiconUrl = getNextLexiconUrl();
      const url = new URL(`${lexiconUrl}/search`);
      
      tagsParams.forEach((tag: string) => {
        if (tag && tag.trim()) {
          url.searchParams.append('tags', tag.trim());
        }
      });

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
    }

    const lexiconUrl = getNextLexiconUrl();
    const url = new URL(`${lexiconUrl}/tags`);

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return NextResponse.json(
        { message: error.message || error.detail || '自动补全失败', tags: [] },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Tag autocomplete API error:', error);
    let errorMessage = '自动补全失败';
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = '无法连接到后端服务，请确认服务是否已启动';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { message: errorMessage, tags: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tags } = body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { message: '缺少标签参数', results: [] },
        { status: 400 }
      );
    }

    const lexiconUrl = getNextLexiconUrl();
    const url = new URL(`${lexiconUrl}/search`);
    
    tags.forEach((tag: string) => {
      if (tag && tag.trim()) {
        url.searchParams.append('tags', tag.trim());
      }
    });

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
    console.error('Tag search API error:', error);
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
