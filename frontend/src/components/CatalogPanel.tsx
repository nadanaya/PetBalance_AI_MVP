import { useSession } from "../state/session";
import type { Product } from "../api/types";
import { won } from "../lib/format";
import { Button, Empty, Section } from "./ui";

export function CatalogPanel() {
  const { state, dispatch, filtered, allProducts } = useSession();
  const q = state.search.trim();
  const extras = state.extras;

  return (
    <Section
      title="급여 조합"
      sub="제품을 끄면 아래 분석과 ‘제외 전후 비교’가 즉시 갱신됩니다"
      right={
        extras.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "removeExtras" })}>
            추가 제품 {extras.length}개 비우기
          </Button>
        ) : undefined
      }
    >
      <div className="stack" style={{ gap: "var(--sp-4)" }}>
        <div className="row" style={{ gap: "var(--sp-3)" }}>
          <input
            className="input"
            placeholder="🔍 제품명 또는 카테고리 검색 (예: 사료, 영양제, 칼슘)"
            value={state.search}
            onChange={(e) => dispatch({ type: "search", value: e.target.value })}
          />
        </div>
        <div className="section-sub">
          {q
            ? `검색 결과 ${filtered.length}개 / 전체 ${allProducts.length}개`
            : `전체 ${allProducts.length}개 제품`}
        </div>

        {filtered.length === 0 ? (
          <Empty>검색어와 일치하는 제품이 없습니다.</Empty>
        ) : (
          <div className="grid-2">
            {filtered.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { state, dispatch } = useSession();
  const sel = state.sel[product.product_id] ?? { daily_amount_g: 1, active: true };
  const daily =
    product.monthly_price_krw > 0 && sel.active && sel.daily_amount_g > 0
      ? (product.monthly_price_krw / 30) *
        (sel.daily_amount_g / product.serving_basis_g)
      : 0;

  return (
    <div
      className="card"
      style={{
        padding: "var(--sp-4)",
        opacity: sel.active ? 1 : 0.55,
        borderColor: sel.active ? "var(--border)" : "var(--border-strong)",
      }}
    >
      <label className="row" style={{ gap: "var(--sp-2)", cursor: "pointer" }}>
        <span className="switch">
          <input
            type="checkbox"
            checked={sel.active}
            onChange={(e) =>
              dispatch({ type: "setActive", id: product.product_id, active: e.target.checked })
            }
          />
          <span className="track" />
        </span>
        <span style={{ fontWeight: 650 }}>{product.name}</span>
        <span className="badge badge-neutral">{product.category}</span>
      </label>

      <div className="field" style={{ marginTop: "var(--sp-3)" }}>
        <label>하루 급여량 (g)</label>
        <input
          className="input"
          type="number"
          min={0}
          max={1000}
          step={1}
          disabled={!sel.active}
          value={sel.daily_amount_g}
          onChange={(e) =>
            dispatch({
              type: "setAmount",
              id: product.product_id,
              amount: Number(e.target.value),
            })
          }
        />
      </div>

      <div className="section-sub" style={{ marginTop: "var(--sp-2)" }}>
        {daily > 0
          ? `약 ${won(daily)}/일 · ${won(daily * 30)}/월 (라벨 ${product.serving_basis_g}g 기준)`
          : "가격 정보 없음"}
        {" · "}
        {product.label_complete ? "라벨 전체 확인" : "일부 미표기 · 신뢰도 제한"}
      </div>
    </div>
  );
}
