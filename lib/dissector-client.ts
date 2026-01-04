/**
 * Dissector API 客户端 - 支持多端口轮询
 */

// 解析环境变量，支持多个端口
function parseDissectorUrls(): string[] {
  const envValue = process.env.DISSECTOR_API || 'http://localhost:8000';
  
  // 如果环境变量包含多个URL（用逗号分隔），则使用它们
  if (envValue.includes(',')) {
    return envValue.split(',').map(url => url.trim());
  }
  
  // 如果环境变量是单个URL，检查是否是端口范围格式（如 192.168.13.1:8001-8004）
  const rangeMatch = envValue.match(/^(.+):(\d+)-(\d+)$/);
  if (rangeMatch) {
    const [, host, startPort, endPort] = rangeMatch;
    const start = parseInt(startPort, 10);
    const end = parseInt(endPort, 10);
    const urls: string[] = [];
    for (let port = start; port <= end; port++) {
      urls.push(`${host}:${port}`);
    }
    return urls;
  }
  
  // 默认返回单个URL
  return [envValue];
}

const DISSECTOR_URLS = parseDissectorUrls();
let currentIndex = 0;

/**
 * 获取下一个可用的 Dissector API URL（轮询）
 */
export function getNextDissectorUrl(): string {
  if (DISSECTOR_URLS.length === 0) {
    return 'http://localhost:8000';
  }
  
  const url = DISSECTOR_URLS[currentIndex];
  currentIndex = (currentIndex + 1) % DISSECTOR_URLS.length;
  return url;
}

/**
 * 获取所有 Dissector API URLs
 */
export function getAllDissectorUrls(): string[] {
  return DISSECTOR_URLS.length > 0 ? DISSECTOR_URLS : ['http://localhost:8000'];
}

