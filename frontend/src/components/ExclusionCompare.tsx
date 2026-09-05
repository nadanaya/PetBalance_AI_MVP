import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AnalyzeResponse } from "../api/types";
import { useSession } from "../state/session";
import { mg, pct } from "../lib/format";
import { DumbbellRow } from "./charts";
import { Section } from "./ui";

export function ExclusionCompare() {
  const { allProducts, selections, inactiveIds, analysis } = useSession();
  const [before, setBefore] = useState<AnalyzeResponse | null>(null);
  const key = JSON.stringify(selections.map((s) => [s.product_id, s.daily_amount_g]));

  useEffect(() => {
    if (inactiveIds.length === 0 || allProducts.length === 0) {
      setBefore(null);
      return;
    }
    const allActive = selections.map((s) => ({ ...s, active: true }));
    api.analyze(allProducts, allActive).then(setBefore).catch(() => setBefore(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, inactiveIds.length]);

  const after = analysis.data;
  if (inactiveIds.length === 0 || !before || !after) return null;

  const excludedNames = allProducts
    .filter((p) => inactiveIds.includes(p.product_id))
    .map((p) => p.name)
    .join(", ");

  const merged = before.summary.map((b) => {
    const a = after.summary.find((x) => x.nutrient === b.nutrient)!;
    return {
      nutrient: b.nutrient,
      before: b.total_mg,
      after: a.total_mg,
      delta: a.total_mg - b.total_mg,
      rate: b.total_mg ? (a.total_mg - b.total_mg) / b.total_mg : 0,
    };
  });
  const axisMax = Math.max(...merged.map((m) => Math.max(m.before, m.after)), 1e-9) * 1.1;

  return (
    <Section
      title="제품 제외 전후 비교"
      sub={`제외한 제품: ${excludedNames} · 전체 활성(전) 대비 현재 선택(후)`}
    >
      <div className="stack" style={{ gap: "var(--sp-4)" }}>
        <div>
          {merged.map((m) => (
            <DumbbellRow
              key={m.nutrient}
              label={m.nutrient}
              before={m.before}
              after={m.after}
              axisMax={axisMax}
            />
          ))}
          <div className="legend">
            <span className="item">
              <span className="swatch" style={{ background: "var(--text-muted)" }} /> 제외 전
            </span>
            <span className="item">
              <span className="swatch" style={{ background: "var(--info)" }} /> 제외 후 (감소)
            </span>
          </div>
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>영양소</th>
                <th className="num">제외 전 (mg)</th>
                <th className="num">제외 후 (mg)</th>
                <th className="num">변동량 (mg)</th>
                <th className="num">변동률</th>
              </tr>
            </thead>
            <tbody>
              {merged.map((m) => (
                <tr key={m.nutrient}>
                  <td>{m.nutrient}</td>
                  <td className="num">{mg(m.before)}</td>
                  <td className="num">{mg(m.after)}</td>
                  <td className="num" style={{ color: m.delta < 0 ? "var(--info)" : "var(--serious)" }}>
                    {m.delta >= 0 ? "+" : ""}
                    {mg(m.delta)}
                  </td>
                  <td className="num">{pct(m.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}
