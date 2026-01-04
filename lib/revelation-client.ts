/**
 * Revelation API 客户端 - 支持多端口轮询
 */

// 解析环境变量，支持多个端口
function parseRevelationUrls(): string[] {
  const envValue = process.env.REVELATION_API || 'http://localhost:5000';
  
  // 如果环境变量包含多个URL（用逗号分隔），则使用它们
  if (envValue.includes(',')) {
    return envValue.split(',').map(url => url.trim());
  }
  
  // 如果环境变量是单个URL，检查是否是端口范围格式（如 192.168.13.1:5001-5004）
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

const REVELATION_URLS = parseRevelationUrls();
let currentIndex = 0;

/**
 * 获取下一个可用的 Revelation API URL（轮询）
 */
export function getNextRevelationUrl(): string {
  if (REVELATION_URLS.length === 0) {
    return 'http://localhost:5000';
  }
  
  const url = REVELATION_URLS[currentIndex];
  currentIndex = (currentIndex + 1) % REVELATION_URLS.length;
  return url;
}

/**
 * 获取所有 Revelation API URLs
 */
export function getAllRevelationUrls(): string[] {
  return REVELATION_URLS.length > 0 ? REVELATION_URLS : ['http://localhost:5000'];
}

