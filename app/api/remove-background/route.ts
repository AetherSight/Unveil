import { NextRequest, NextResponse } from 'next/server';
import { getNextDissectorUrl } from '@/lib/dissector-client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('file') as File | null;
    
    if (!imageFile) {
      return NextResponse.json(
        { message: '缺少图片文件' },
        { status: 400 }
      );
    }

    const backendFormData = new FormData();
    backendFormData.append('file', imageFile);

    // 使用轮询获取下一个可用的服务地址
    const dissectorUrl = getNextDissectorUrl();
    const response = await fetch(`${dissectorUrl}/remove-background`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return NextResponse.json(
        { message: error.message || error.detail || '去除背景失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Remove background API error:', error);
    let errorMessage = '去除背景失败';
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = '无法连接到后端服务，请确认服务是否已启动';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

