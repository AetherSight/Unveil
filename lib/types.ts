// API 响应类型定义

export interface SegmentResponse {
  upper?: string; // base64 encoded image
  lower?: string;
  shoes?: string;
  head?: string;
  hands?: string;
}

export interface PredictionResult {
  rank: number;
  label: string;
  score: number;
  name?: string;
  id?: string;
}

export interface PredictResponse {
  results: PredictionResult[];
}

export interface ApiError {
  message: string;
  detail?: string;
}

