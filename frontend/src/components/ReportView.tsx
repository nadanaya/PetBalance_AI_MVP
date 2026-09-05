import { useSession } from "../state/session";
import { mg, pct, statusMeta } from "../lib/format";
import { costRows } from "../lib/calc";
import { won } from "../lib/format";
import { Badge, Card, Notice } from "./ui";

export function ReportView() {
  const { state, allProducts, selections, analysis } = useSession();
  const data = analysis.data;
  const p = state.profile;
  const activeProducts = allProducts.filter(
    (x) => selections.find((s) => s.product_id === x.product_id)?.active,
  );
  const costs = costRows(allProducts, selections);
  const totalMonthly = costs.reduce((a, b) => a + b.monthly_cost, 0);
  const attention =
    data?.summary.filter((r) =>
      ["중복 가능", "기준 초과 가능", "정보 부족"].includes(r.status),
    ) ?? [];

  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <Card>
        <h1 style={{ fontSize: 17, letterSpacing: "-0.02em" }}>
          {p.name} 영양 분석 리포트
        </h1>
        <div className="section-sub" style={{ marginTop: 3 }}>
          생성: {new Date().toLocaleString("ko-KR")} · 분석 기준: 성견 데모
        </div>

        <div style={{ marginTop: "var(--sp-4)" }}>
          <Notice tone="warn">
            본 리포트는 기능 검증용 데모 기준으로 작성되었습니다. 질병 진단·치료·처방
            또는 실제 급여 판단에 사용할 수 없습니다.
          </Notice>
        </div>

        <div className="stat-row" style={{ marginTop: "var(--sp-4)" }}>
          <div className="stat">
            <span className="k">반려동물</span>
            <span className="v" style={{ fontSize: 16 }}>
              {p.name}
            </span>
          </div>
          <div className="stat">
            <span className="k">나이 · 체중</span>
            <span className="v" style={{ fontSize: 16 }}>
              {p.age}세 · {p.weight.toFixed(1)}kg
            </span>
          </div>
          <div className="stat">
            <span className="k">품종 · 중성화</span>
            <span className="v" style={{ fontSize: 16 }}>
              {p.breed || "미입력"} · {p.neutered ? "완료" : "미완료"}
            </span>
          </div>
          <div className="stat">
            <span className="k">월 예상 비용</span>
            <span className="v" style={{ fontSize: 16 }}>
              {won(totalMonthly)}
            </span>
          </div>
        </div>

        <h3 style={{ marginTop: "var(--sp-5)" }} className="section-title">
          급여 제품
        </h3>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>제품</th>
                <th>분류</th>
                <th className="num">하루 급여량 (g)</th>
                <th className="num">라벨 기준 (g)</th>
              </tr>
            </thead>
            <tbody>
              {activeProducts.map((x) => {
                const s = selections.find((y) => y.product_id === x.product_id)!;
                return (
                  <tr key={x.product_id}>
                    <td>{x.name}</td>
                    <td>{x.category}</td>
                    <td className="num">{s.daily_amount_g}</td>
                    <td className="num">{x.serving_basis_g}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h3 style={{ marginTop: "var(--sp-5)" }} className="section-title">
          영양소 분석 결과
        </h3>
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
              {(data?.summary ?? []).map((r) => {
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

        <h3 style={{ marginTop: "var(--sp-5)" }} className="section-title">
          확인 필요 사항
        </h3>
        {attention.length === 0 ? (
          <div className="section-sub">현재 입력에서 확인 필요 신호가 없습니다.</div>
        ) : (
          <ul className="secondary" style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {attention.map((r) => {
              const contrib = data?.contributions[r.nutrient] ?? [];
              return (
                <li key={r.nutrient} style={{ marginBottom: 4 }}>
                  <strong>{r.nutrient}</strong>: {r.status}
                  {r.status === "정보 부족"
                    ? " — 라벨 누락값을 0으로 계산하지 않았습니다."
                    : ` — 추정 ${mg(r.total_mg)} mg/day · ${contrib
                        .map((c) => `${c.product_name} ${Math.round(c.share_pct)}%`)
                        .join(" + ")}`}
                </li>
              );
            })}
          </ul>
        )}

        <h3 style={{ marginTop: "var(--sp-5)" }} className="section-title">
          계산 방식과 데이터 신뢰도
        </h3>
        <div className="section-sub" style={{ lineHeight: 1.7 }}>
          제품별 하루 영양소량 = 라벨상 함량 × 실제 하루 급여량 ÷ 라벨 기준량.
          <br />
          판정은 규칙 엔진이 수행하며, 누락값은 0으로 간주하지 않습니다.
          <br />
          기준표 verified=false: 수의영양학 검토 전 교육용 데모 데이터.
        </div>
      </Card>
    </div>
  );
}
