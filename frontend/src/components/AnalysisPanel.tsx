import { useSession } from "../state/session";
import { mg, pct, statusMeta } from "../lib/format";
import { NutrientBar } from "./charts";
import { Badge, Empty, Notice, Section } from "./ui";

export function AnalysisPanel() {
  const { analysis } = useSession();
  const { data, loading, error } = analysis;

  if (error) return <Section title="영양소 분석"><Notice tone="warn">{error}</Notice></Section>;
  if (!data) {
    return (
      <Section title="영양소 분석">
        {loading ? <div className="skeleton" style={{ height: 180 }} /> : <Empty>활성 제품이 없습니다.</Empty>}
      </Section>
    );
  }

  const rows = data.summary;
  const axisMax = Math.max(...rows.map((r) => Math.max(r.total_mg, r.demo_max_mg)), 1e-9) * 1.1;

  return (
    <Section
      title="영양소 분석"
      sub="제품별 하루 영양소량 = 라벨 함량 × 하루 급여량 ÷ 라벨 기준량 · 누락값은 0으로 계산하지 않음"
    >
      <div className="stack" style={{ gap: "var(--sp-5)" }}>
        <div>
          {rows.map((r) => {
            const m = statusMeta(r.status);
            return (
              <NutrientBar
                key={r.nutrient}
                label={r.nutrient}
                total={r.total_mg}
                min={r.demo_min_mg}
                max={r.demo_max_mg}
                axisMax={axisMax}
                kind={m.kind}
                valueText={`${mg(r.total_mg)} / ${pct(r.range_ratio)}`}
              />
            );
          })}
          <div className="legend">
            <span className="item">
              <span className="swatch" style={{ background: "var(--border)" }} /> 참고 최소~최대 구간
            </span>
            <span className="item">
              <span
                className="swatch"
                style={{ width: 2, height: 12, borderRadius: 0, background: "var(--text-secondary)" }}
              />
              참고 최대선
            </span>
          </div>
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>영양소</th>
                <th className="num">추정 하루 총량 (mg)</th>
                <th className="num">참고 최소</th>
                <th className="num">참고 최대</th>
                <th className="num">참고 최대 대비</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = statusMeta(r.status);
                return (
                  <tr key={r.nutrient}>
                    <td>{r.nutrient}</td>
                    <td className="num">{mg(r.total_mg)}</td>
                    <td className="num">{mg(r.demo_min_mg)}</td>
                    <td className="num">{mg(r.demo_max_mg)}</td>
                    <td className="num">{pct(r.range_ratio)}</td>
                    <td>
                      <Badge kind={m.kind} icon={m.icon}>
                        {m.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Rationale />
      </div>
    </Section>
  );
}

function Rationale() {
  const { analysis } = useSession();
  const data = analysis.data;
  if (!data) return null;
  const attention = data.summary.filter((r) =>
    ["중복 가능", "기준 초과 가능", "정보 부족"].includes(r.status),
  );

  if (attention.length === 0) {
    return (
      <Notice tone="info" icon="✓">
        현재 입력에서 확인 필요 신호가 없습니다. 이는 실제 영양 적합성을 보장하지 않습니다.
      </Notice>
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--sp-3)" }}>
      <div className="section-title">근거와 다음 행동</div>
      {attention.map((r) => {
        const contrib = data.contributions[r.nutrient] ?? [];
        const m = statusMeta(r.status);
        return (
          <Notice key={r.nutrient} tone="warn" icon={m.icon}>
            <strong>
              {r.nutrient}: {r.status}
            </strong>
            {r.status === "정보 부족" ? (
              <> — 제품 라벨 누락값을 0으로 계산하지 않았습니다. 미표기 제품의 라벨을 확인하세요.</>
            ) : (
              <>
                {" "}
                — 추정 {mg(r.total_mg)} mg/day. 제품별 기여:{" "}
                {contrib
                  .map((c) => `${c.product_name} ${Math.round(c.share_pct)}%`)
                  .join(" + ")}
              </>
            )}
          </Notice>
        );
      })}
    </div>
  );
}
