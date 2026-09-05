import type { Product, Selection } from "../api/types";

export interface CostRow {
  product_id: string;
  name: string;
  category: string;
  daily_amount_g: number;
  serving_basis_g: number;
  monthly_price_krw: number;
  daily_cost: number;
  monthly_cost: number;
}

/** 라벨 기준량 대비 실제 하루 급여량 비율로 비용을 산정한다(레거시 앱과 동일 공식). */
export function costRows(products: Product[], selections: Selection[]): CostRow[] {
  const byId = new Map(selections.map((s) => [s.product_id, s]));
  const rows: CostRow[] = [];
  for (const p of products) {
    const sel = byId.get(p.product_id);
    if (!sel || !sel.active || sel.daily_amount_g <= 0) continue;
    if (!p.monthly_price_krw || p.monthly_price_krw <= 0) continue;
    const daily =
      (p.monthly_price_krw / 30) * (sel.daily_amount_g / p.serving_basis_g);
    rows.push({
      product_id: p.product_id,
      name: p.name,
      category: p.category,
      daily_amount_g: sel.daily_amount_g,
      serving_basis_g: p.serving_basis_g,
      monthly_price_krw: p.monthly_price_krw,
      daily_cost: daily,
      monthly_cost: daily * 30,
    });
  }
  return rows;
}

export const DEFAULT_AMOUNTS: Record<string, number> = {
  food_a: 120,
  supp_cal: 2,
  snack_a: 10,
  multi_a: 3,
};

export function slug(name: string): string {
  const base =
    name
      .trim()
      .replace(/[^0-9a-zA-Z가-힣]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24)
      .toLowerCase() || "label";
  return `user_${base}_${Math.random().toString(16).slice(2, 6)}`;
}
