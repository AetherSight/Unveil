/**
 * 请求日志记录工具
 */

export function logRequest(
  method: string,
  url: string,
  status: number,
  duration: number,
  ip?: string
) {
  const timestamp = new Date().toISOString();
  const statusColor = status >= 500 ? '🔴' : status >= 400 ? '🟡' : '🟢';
  const ipInfo = ip ? ` - IP: ${ip}` : '';
  const durationInfo = duration > 1000 ? ` - ${duration}ms (slow)` : ` - ${duration}ms`;
  
  console.log(
    `[${timestamp}] ${statusColor} ${method} ${url} - ${status}${durationInfo}${ipInfo}`
  );
}

export function logError(method: string, url: string, error: unknown, ip?: string) {
  const timestamp = new Date().toISOString();
  const ipInfo = ip ? ` - IP: ${ip}` : '';
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  console.error(
    `[${timestamp}] 🔴 ${method} ${url} - ERROR: ${errorMessage}${ipInfo}`
  );
}

