import { NextRequest, NextResponse } from 'next/server';

const REVELATION_API = process.env.REVELATION_API || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const topK = request.nextUrl.searchParams.get('top_k') || '5';

    const imageFile = formData.get('image') as File | null;
    if (!imageFile) {
      return NextResponse.json(
        { message: '缺少图片文件' },
        { status: 400 }
      );
    }

    const backendFormData = new FormData();
    backendFormData.append('image', imageFile);

    const url = new URL(`${REVELATION_API}/predict`);
    url.searchParams.set('top_k', topK.toString());

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return NextResponse.json(
        { message: error.message || error.detail || '识别失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Predict API error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '识别失败' },
      { status: 500 }
    );
  }
}

