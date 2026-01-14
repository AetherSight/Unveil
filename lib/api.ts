import type { SegmentResponse, PredictResponse, ApiError } from './types';

export async function segmentImage(
  imageFile: File,
  boxThreshold: number = 0.3,
  textThreshold: number = 0.25
): Promise<SegmentResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const url = new URL('/api/segment', window.location.origin);
  url.searchParams.set('box_threshold', boxThreshold.toString());
  url.searchParams.set('text_threshold', textThreshold.toString());

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || error.detail || '分割失败');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('无法连接到服务器，请检查网络连接或确认后端服务是否已启动');
    }
    throw error;
  }
}

export async function predictEquipment(
  imageFile: File,
  topK: number = 5,
  patchWeight: number = 0.3,
  patchOnly?: boolean
): Promise<PredictResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const url = new URL('/api/predict', window.location.origin);
  url.searchParams.set('top_k', topK.toString());
  
  // patchWeight 默认值为 0.3，始终传递
  url.searchParams.set('patch_weight', patchWeight.toString());
  
  if (patchOnly !== undefined) {
    url.searchParams.set('patch_only', patchOnly.toString());
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || error.detail || '识别失败');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('无法连接到服务器，请检查网络连接或确认后端服务是否已启动');
    }
    throw error;
  }
}

export async function sendFeedback(
  imageFile: File,
  label: string
): Promise<void> {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('label', label);

  const url = new URL('/api/feedback', window.location.origin);

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.message || error.detail || '反馈失败');
  }
}

export async function removeBackground(imageFile: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', imageFile);

  try {
    const response = await fetch('/api/remove-background', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || error.detail || '去除背景失败');
    }

    const data = await response.json();
    return data.image;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('无法连接到服务器，请检查网络连接或确认后端服务是否已启动');
    }
    throw error;
  }
}

export async function checkHealth(service: 'dissector' | 'revelation'): Promise<boolean> {
  try {
    const url = new URL('/api/health', window.location.origin);
    url.searchParams.set('service', service);
    const response = await fetch(url.toString());
    const data = await response.json();
    return data.healthy === true;
  } catch {
    return false;
  }
}

export async function searchAutocomplete(
  query: string,
  limit: number = 10
): Promise<string[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  const url = new URL('/api/search/autocomplete', window.location.origin);
  url.searchParams.set('q', query.trim());
  url.searchParams.set('limit', Math.min(limit, 50).toString());

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || error.detail || '自动补全失败');
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('无法连接到服务器，请检查网络连接或确认后端服务是否已启动');
    }
    throw error;
  }
}

export async function searchEquipment(
  query: string,
  limit: number = 10
): Promise<PredictResponse> {
  if (!query || query.trim() === '') {
    return { results: [] };
  }

  const url = new URL('/api/search', window.location.origin);
  url.searchParams.set('q', query.trim());
  url.searchParams.set('limit', Math.min(limit, 50).toString());

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || error.detail || '搜索失败');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('无法连接到服务器，请检查网络连接或确认后端服务是否已启动');
    }
    throw error;
  }
}

