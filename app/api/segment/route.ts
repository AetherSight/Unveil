import { NextRequest, NextResponse } from 'next/server';

const DISSECTOR_API = process.env.DISSECTOR_API || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const boxThreshold = request.nextUrl.searchParams.get('box_threshold') || '0.3';
    const textThreshold = request.nextUrl.searchParams.get('text_threshold') || '0.25';

    const imageFile = formData.get('image') as File | null;
    if (!imageFile) {
      return NextResponse.json(
        { message: '缺少图片文件' },
        { status: 400 }
      );
    }

    const backendFormData = new FormData();
    backendFormData.append('file', imageFile);

    const url = new URL(`${DISSECTOR_API}/segment`);
    url.searchParams.set('box_threshold', boxThreshold);
    url.searchParams.set('text_threshold', textThreshold);

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return NextResponse.json(
        { message: error.message || error.detail || '分割失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Segment API error:', error);
    let errorMessage = '分割失败';
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = `无法连接到后端服务 (${DISSECTOR_API})，请确认服务是否已启动`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

