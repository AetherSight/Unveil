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
}

export async function predictEquipment(
  imageFile: File,
  topK: number = 5
): Promise<PredictResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const url = new URL('/api/predict', window.location.origin);
  url.searchParams.set('top_k', topK.toString());

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

