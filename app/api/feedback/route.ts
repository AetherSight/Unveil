import { NextRequest, NextResponse } from 'next/server';
import { getNextRevelationUrl } from '@/lib/revelation-client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const imageFile = formData.get('image') as File | null;
    const label = formData.get('label') as string | null;

    if (!imageFile) {
      return NextResponse.json(
        { message: '缺少图片文件' },
        { status: 400 }
      );
    }

    if (!label) {
      return NextResponse.json(
        { message: '缺少装备标签' },
        { status: 400 }
      );
    }

    const backendFormData = new FormData();
    backendFormData.append('image', imageFile);
    backendFormData.append('label', label);

    // 使用轮询获取下一个可用的服务地址
    const revelationUrl = getNextRevelationUrl();
    const url = new URL(`${revelationUrl}/feedback`);

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return NextResponse.json(
        { message: error.message || error.detail || '反馈失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '反馈失败' },
      { status: 500 }
    );
  }
}

