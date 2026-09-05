import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { RecommendResponse } from "../api/types";
import { useSession } from "../state/session";
import { Badge, Button, Card, Empty, Notice, Section } from "./ui";

export function RecommendView() {
  const { allProducts, selections, dispatch, state } = useSession();
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const key = JSON.stringify(selections);
  useEffect(() => {
    if (allProducts.length === 0) return;
    setLoading(true);
    api
      .recommend(allProducts, selections)
      .then((d) => {
        setData(d);
        setErr(null);
      })
      .catch((e) => setErr(String((e as Error).message || e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function applySwap(replaceId: string, withId: string) {
    const amount = state.sel[replaceId]?.daily_amount_g ?? 1;
    dispatch({ type: "setActive", id: replaceId, active: false });
    dispatch({ type: "setActive", id: withId, active: true });
    dispatch({ type: "setAmount", id: withId, amount });
  }

  return (
    <Section
      title="대체 제품 추천"
      sub="현재 조합의 ‘기준 초과 가능·중복 가능’ 신호를 줄이는 카탈로그 대안을 규칙으로 점수화합니다 · F-019"
    >
      {loading && <div className="skeleton" style={{ height: 120 }} />}
      {err && <Notice tone="warn">{err}</Notice>}
      {data && (
        <div className="stack" style={{ gap: "var(--sp-4)" }}>
          {data.flagged_nutrients.length === 0 ? (
            <Notice tone="info" icon="✓">
              확인 필요 신호가 없어 추천할 대체 제품이 없습니다.
            </Notice>
          ) : (
            <div className="section-sub">
              신호 영양소:{" "}
              {data.flagged_nutrients.map((n) => (
                <span key={n} className="badge badge-warning" style={{ marginRight: 4 }}>
                  {n}
                </span>
              ))}
            </div>
          )}

          {data.suggestions.length === 0 ? (
            <Empty>개선 효과가 있는 대체안을 찾지 못했습니다.</Empty>
          ) : (
            data.suggestions.map((s, i) => (
              <Card key={i} pad={false} className="card-pad">
                <div className="row spread" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 650 }}>
                      <s style={{ color: "var(--text-muted)" }}>{s.replace.name}</s> →{" "}
                      {s.with.name}
                      {s.with.brand && (
                        <span className="muted"> · {s.with.brand}</span>
                      )}
                    </div>
                    <div className="section-sub" style={{ marginTop: 4 }}>
                      벌점 {s.base_penalty.toFixed(2)} → {s.new_penalty.toFixed(2)} (개선{" "}
                      {s.improvement.toFixed(2)})
                      {s.resolves.length > 0 && (
                        <> · 해소: {s.resolves.join(", ")}</>
                      )}
                    </div>
                  </div>
                  <div className="row" style={{ gap: "var(--sp-2)" }}>
                    <Badge kind="ok" icon="↓">
                      {Math.round((s.improvement / (s.base_penalty || 1)) * 100)}% 개선
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => applySwap(s.replace.product_id, s.with.product_id)}
                    >
                      이 교체 적용
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
          <p className="section-sub">
            추천은 규칙 기반 점수(과잉 3×·부족 1×·중복/정보부족 가산)이며 수의학적 처방이
            아닙니다.
          </p>
        </div>
      )}
    </Section>
  );
}
