// API 响应类型定义

export interface SegmentResponse {
  upper?: string; // base64 encoded image
  upper_1?: string; // upper variant 1
  upper_2?: string; // upper variant 2
  upper_3?: string; // upper variant 3
  upper_4?: string; // upper variant 4
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

export interface TagSearchResult {
  equipment_id: string;
  equipment_name: string;
  all_labels: string;
  appearance_description: string;
  match_score: number;
  matched_labels: string[];
  description_matches: string[];
  name_matches: string[];
  same_model_gears?: SameModelGear[];
}

export interface TagSearchResponse {
  query_tags: string[];
  total_matches: number;
  results: TagSearchResult[];
}

export interface EquipmentDetail {
  equipment_id: string;
  equipment_name: string;
  colors?: string[];
  materials?: string[];
  shapes?: string[];
  decorations?: string[];
  styles?: string[];
  effects?: string[];
  custom_tags?: string[];
  appearance_looks_like?: string[];
  appearance_description?: string;
  front_image?: string;
  back_image?: string;
}
