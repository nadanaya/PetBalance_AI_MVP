import { useMemo, useState } from "react";
import { useSession } from "../state/session";
import { mg, statusMeta } from "../lib/format";
import { Card, Empty, Notice } from "./ui";

const STATUS_WORD: Record<string, { w: string; cls: string }> = {
  "정보 충분": { w: "충분", cls: "ok" },
  "기준 초과 가능": { w: "주의 · 많음", cls: "critical" },
  "중복 가능": { w: "주의 · 중복", cls: "warning" },
  "참고 범위 미만": { w: "부족", cls: "info" },
  "정보 부족": { w: "정보 없음", cls: "neutral" },
};
const WASH: Record<string, string> = {
  ok: "var(--ok-wash)",
  critical: "var(--critical-wash)",
  warning: "var(--warning-wash)",
  info: "var(--info-wash)",
  neutral: "var(--surface-3)",
};
const INK: Record<string, string> = {
  ok: "var(--ok)",
  critical: "var(--critical)",
  warning: "var(--warning)",
  info: "var(--info)",
  neutral: "var(--text-secondary)",
};
const BAR: Record<string, string> = {
  ok: "var(--ok)",
  warning: "var(--warning)",
  critical: "var(--critical)",
  info: "var(--info)",
  neutral: "var(--text-muted)",
};

function StatusBadge({ status }: { status: string }) {
  const sw = STATUS_WORD[status] ?? { w: status, cls: "neutral" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 999,
        background: WASH[sw.cls],
        color: INK[sw.cls],
        whiteSpace: "nowrap",
      }}
    >
      {statusMeta(status).icon} {sw.w}
    </span>
  );
}

export function DietBoard({ mode = "diet", onAdd }: { mode?: "diet" | "analysis"; onAdd?: () => void }) {
  const { allProducts, selections, analysis, state, dispatch } = useSession();
  const [addId, setAddId] = useState("");

  const activeById = useMemo(
    () => Object.fromEntries(selections.filter((s) => s.active).map((s) => [s.product_id, s])),
    [selections],
  );
  const feeding = allProducts.filter((p) => activeById[p.product_id]);
  const addable = allProducts.filter((p) => !activeById[p.product_id]);

  const s = analysis.data?.summary ?? [];
  const warns = s.filter((r) => ["중복 가능", "기준 초과 가능"].includes(r.status));
  const lacks = s.filter((r) => r.status === "참고 범위 미만");
  const fed = s.filter((r) => r.total_mg > 0);
  const notFed = s.filter((r) => r.total_mg === 0);

  return (
    <div className="stack">
      {mode === "analysis" && analysis.error && <Notice tone="warn">{analysis.error}</Notice>}
      {mode === "analysis" && analysis.loading && <Notice>영양소를 분석하고 있어요.</Notice>}
      {mode === "analysis" && feeding.length === 0 && <Card><Empty>급여조합에 제품과 하루 급여량을 입력하면 영양소 분석을 볼 수 있어요.</Empty><button className="btn btn-primary" onClick={onAdd}>제품 추가하기</button></Card>}

      {/* 요약 배너 */}
      {mode === "analysis" && feeding.length > 0 && s.length > 0 && !analysis.loading && !analysis.error && (
        <Card
          className="card-pad"
          style={{
            background:
              warns.length > 0
                ? "var(--critical-wash)"
                : lacks.length > 0
                  ? "var(--info-wash)"
                  : "var(--ok-wash)",
            borderColor: "transparent",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {warns.length > 0
              ? `${state.profile.name} 식단에서 주의가 필요한 영양소 ${warns.length}개`
              : lacks.length > 0
                ? `참고 범위보다 부족한 영양소 ${lacks.length}개`
                : s.some((r) => r.status === "정보 부족")
                  ? "라벨 정보가 부족한 영양소를 확인해 주세요"
                  : "입력한 영양소가 참고 범위 안에 있어요"}
          </div>
          <div className="section-sub" style={{ marginTop: 4 }}>
            {warns.length > 0
              ? warns.map((w) => w.nutrient).join(", ") + " — 아래 ‘영양소 현황’에서 확인하세요."
              : "이 판정은 실제 영양 적합성을 보장하지 않습니다."}
          </div>
        </Card>
      )}

      {/* 먹이는 제품 + 급여량 입력 */}
      {mode === "diet" && <Card className="card-pad">
        <div className="row spread" style={{ marginBottom: 12 }}>
          <div>
            <div className="section-title">먹이는 제품</div>
            <div className="section-sub">
              지금 급여 중인 사료·간식·영양제와 하루에 주는 양(g)을 입력하세요.
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <select
              className="input"
              style={{ width: 220 }}
              value={addId}
              onChange={(e) => setAddId(e.target.value)}
            >
              <option value="">＋ 제품 추가…</option>
              {addable.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.name} · {p.category}
                </option>
              ))}
            </select>
            <button
              className="btn btn-sm btn-primary"
              disabled={!addId}
              onClick={() => {
                dispatch({ type: "setActive", id: addId, active: true });
                setAddId("");
              }}
            >
              추가
            </button>
          </div>
        </div>

        {feeding.length === 0 ? (
          <Empty>아직 먹이는 제품이 없어요. 위에서 선택하거나 ‘제품 추가’에서 등록하세요.</Empty>
        ) : (
          <table className="table feeding-table">
            <thead>
              <tr>
                <th>제품</th>
                <th>분류</th>
                <th className="num" style={{ width: 150 }}>
                  하루 급여량 (g)
                </th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {feeding.map((p) => {
                const g = activeById[p.product_id].daily_amount_g;
                return (
                  <tr key={p.product_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="section-sub">
                        {p.brand || "브랜드"}
                        {!p.label_complete && " · 일부 미표기"}
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td className="num">
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <button
                          className="btn btn-sm"
                          onClick={() =>
                            dispatch({ type: "setAmount", id: p.product_id, amount: Math.max(0, g - 10) })
                          }
                        >
                          −10
                        </button>
                        <input
                          className="input"
                          type="number"
                          aria-label={`${p.name} 하루 급여량 (g)`}
                          min={0}
                          value={g}
                          onChange={(e) =>
                            dispatch({
                              type: "setAmount",
                              id: p.product_id,
                              amount: Math.max(0, Number(e.target.value)),
                            })
                          }
                          style={{ width: 68, textAlign: "center", fontWeight: 700 }}
                        />
                        <button
                          className="btn btn-sm"
                          onClick={() => dispatch({ type: "setAmount", id: p.product_id, amount: g + 10 })}
                        >
                          +10
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="빼기"
                        aria-label={`${p.name} 식단에서 빼기`}
                        onClick={() => dispatch({ type: "setActive", id: p.product_id, active: false })}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <button className="btn" onClick={onAdd} style={{ marginTop: 12 }}>제품 검색 · 직접 등록</button>
      </Card>}

      {/* 영양소 현황 */}
      {mode === "analysis" && feeding.length > 0 && !analysis.loading && !analysis.error && <>
      {s.length > 0 && (
        <Card className="card-pad">
          <div className="section-title">영양소 현황</div>
          <div className="section-sub" style={{ marginBottom: 10 }}>
            하루 급여량 기준으로 계산한 성분별 총량과 참고 범위입니다.
          </div>
          {s.map((r) => {
            const kind = statusMeta(r.status).kind;
            const axisMax = Math.max(r.total_mg, r.demo_max_mg, 1e-9) * 1.15;
            const w = (v: number) => Math.min(100, (v / axisMax) * 100) + "%";
            return (
              <div key={r.nutrient} style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                <div className="row" style={{ gap: 8 }}>
                  <b style={{ fontSize: 13 }}>{r.nutrient}</b>
                  <StatusBadge status={r.status} />
                  <span
                    className="right"
                    style={{
                      fontSize: 12.5,
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                      marginLeft: "auto",
                    }}
                  >
                    {mg(r.total_mg)} mg
                  </span>
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 12,
                    background: "var(--surface-3)",
                    borderRadius: 4,
                    marginTop: 6,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: w(r.demo_min_mg),
                      width: `calc(${w(r.demo_max_mg)} - ${w(r.demo_min_mg)})`,
                      background: "var(--border)",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: w(r.total_mg),
                      background: BAR[kind],
                      borderRadius: 4,
                    }}
                  />
                </div>
                <div className="section-sub" style={{ fontSize: 10.5, marginTop: 3 }}>
                  참고 {mg(r.demo_min_mg)}–{mg(r.demo_max_mg)} mg
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* 지금 먹이고 있는 성분 */}
      {fed.length > 0 && (
        <Card className="card-pad">
          <div className="section-title">지금 먹이고 있는 성분</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
            {fed.map((r) => {
              const sw = STATUS_WORD[r.status] ?? { cls: "neutral" };
              return (
                <span
                  key={r.nutrient}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "5px 10px",
                    borderRadius: 999,
                    background: WASH[sw.cls],
                    color: INK[sw.cls],
                  }}
                >
                  {r.nutrient} {mg(r.total_mg)}mg
                </span>
              );
            })}
          </div>
          <div className="section-sub" style={{ marginTop: 10 }}>
            참고 기준에 있는 성분 중 아직 안 먹이는 것:{" "}
            {notFed.length ? notFed.map((r) => r.nutrient).join(", ") : "없음"}
          </div>
        </Card>
      )}

      {/* 경고 상세 */}
      {s
        .filter((r) => ["중복 가능", "기준 초과 가능", "정보 부족"].includes(r.status))
        .map((r) => {
          const cs = analysis.data?.contributions[r.nutrient] ?? [];
          return (
            <Card
              key={r.nutrient}
              className="card-pad"
              style={{ borderColor: "color-mix(in srgb, var(--warning) 45%, transparent)" }}
            >
              <b style={{ fontSize: 13 }}>
                {r.nutrient} · {STATUS_WORD[r.status]?.w ?? r.status}
              </b>
              <div className="section-sub" style={{ marginTop: 4 }}>
                {r.status === "정보 부족"
                  ? "라벨에 이 성분이 표기되지 않은 제품이 있어 정확히 알 수 없어요. 누락값을 0으로 계산하지 않았습니다."
                  : `하루 약 ${mg(r.total_mg)} mg. ${cs
                      .map((c) => `${c.product_name} ${Math.round(c.share_pct)}%`)
                      .join(" + ")} 에서 나와요.`}
              </div>
            </Card>
          );
        })}
      </>}
    </div>
  );
}
