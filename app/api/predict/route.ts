import { NextRequest, NextResponse } from 'next/server';
import { getNextRevelationUrl } from '@/lib/revelation-client';

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

    // 使用轮询获取下一个可用的服务地址
    const revelationUrl = getNextRevelationUrl();
    const url = new URL(`${revelationUrl}/predict`);
    url.searchParams.set('top_k', topK.toString());

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      
      // 处理模型未加载的错误
      const errorMessage = error.message || error.detail || '识别失败';
      let userMessage = errorMessage;
      
      if (errorMessage.toLowerCase().includes('models not loaded') || 
          errorMessage.toLowerCase().includes('model not loaded')) {
        userMessage = '后端模型正在加载中，请稍候片刻后重试。如果问题持续，请检查后端服务日志。';
      }
      
      return NextResponse.json(
        { message: userMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Predict API error:', error);
    let errorMessage = '识别失败';
    
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

