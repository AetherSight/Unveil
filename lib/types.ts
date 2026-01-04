// API 响应类型定义

export interface SegmentResponse {
  upper?: string; // base64 encoded image
  lower?: string;
  shoes?: string;
  head?: string;
  hands?: string;
}

export interface SameModelGear {
  id: string;
  name: string;
}

export interface PredictionResult {
  rank: number;
  label: string;
  score: number;
  name?: string;
  id?: string;
  same_model_gears?: SameModelGear[];
}

export interface PredictResponse {
  results: PredictionResult[];
}

export interface ApiError {
  message: string;
  detail?: string;
}

