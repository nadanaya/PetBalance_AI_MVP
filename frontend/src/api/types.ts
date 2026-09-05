export interface NutrientAmount {
  nutrient: string;
  amount_mg: number;
  label_complete: boolean;
}

export interface Product {
  product_id: string;
  name: string;
  brand?: string | null;
  category: string;
  serving_basis_g: number;
  monthly_price_krw: number;
  label_complete: boolean;
  source?: string;
  nutrients: NutrientAmount[];
}

export interface User {
  user_id: number;
  email: string;
  display_name: string | null;
}

export interface Offer {
  product_id: string;
  vendor: string;
  price_krw: number;
  unit: string;
  url: string;
  updated_at: string;
}

export interface Swap {
  replace: { product_id: string; name: string };
  with: { product_id: string; name: string; brand?: string | null; category: string };
  improvement: number;
  base_penalty: number;
  new_penalty: number;
  resolves: string[];
}

export interface RecommendResponse {
  flagged_nutrients: string[];
  base_penalty: number;
  suggestions: Swap[];
}

export interface Selection {
  product_id: string;
  daily_amount_g: number;
  active: boolean;
}

export interface StandardRow {
  nutrient: string;
  demo_min_mg: number;
  demo_max_mg: number;
  unit?: string;
  source?: string;
  source_url?: string;
  version?: string;
  basis?: string;
  verified?: boolean | number;
}

export type NutrientStatus =
  | "정보 충분"
  | "중복 가능"
  | "기준 초과 가능"
  | "참고 범위 미만"
  | "정보 부족";

export interface SummaryRow {
  nutrient: string;
  demo_min_mg: number;
  demo_max_mg: number;
  total_mg: number;
  product_count: number;
  data_complete: boolean;
  status: NutrientStatus;
  range_ratio: number;
}

export interface IntakeRow {
  nutrient: string;
  product_id: string;
  product_name: string;
  daily_nutrient_mg: number;
  label_complete: boolean;
}

export interface Contribution {
  product_name: string;
  daily_nutrient_mg: number;
  share_pct: number;
}

export interface AnalyzeResponse {
  summary: SummaryRow[];
  intake: IntakeRow[];
  contributions: Record<string, Contribution[]>;
}

export interface OcrDraft {
  product_name: string;
  category: string;
  serving_basis_g: number;
  label_complete: boolean;
  nutrients: {
    nutrient: string;
    amount_mg: number;
    source_text: string;
    source_unit: string;
  }[];
  unparsed_lines: string[];
  categories: string[];
  raw_text: string;
  engine?: "vision" | "tesseract" | "text";
}

export interface Pet {
  pet_id: number;
  name: string;
  species: string;
  weight_kg: number;
  life_stage: string;
  breed: string | null;
  neutered: boolean;
}
