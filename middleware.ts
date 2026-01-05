import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // 记录请求日志
  const start = Date.now();
  const { pathname, search } = request.nextUrl;
  const method = request.method;
  const url = `${pathname}${search}`;
  
  // 获取客户端 IP
  const ip = request.headers.get('x-real-ip') || 
             request.headers.get('x-forwarded-for')?.split(',')[0] || 
             'unknown';
  
  // 创建响应
  const response = NextResponse.next();
  
  // 添加响应头用于记录
  response.headers.set('x-request-start', start.toString());
  response.headers.set('x-request-url', url);
  response.headers.set('x-request-method', method);
  
  // 记录请求（简化版，响应状态码和完整时间需要在 API 路由中记录）
  console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip}`);
  
  return response;
}

// 配置中间件匹配的路径
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - api (Next.js API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

