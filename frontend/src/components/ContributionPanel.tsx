import { useEffect, useState } from "react";
import { useSession } from "../state/session";
import { mg } from "../lib/format";
import { ContributionStack } from "./charts";
import { Empty, Section } from "./ui";

export function ContributionPanel() {
  const { analysis } = useSession();
  const data = analysis.data;
  const nutrients = data?.summary.map((s) => s.nutrient) ?? [];
  const [picked, setPicked] = useState<string>("");

  useEffect(() => {
    if (nutrients.length && !nutrients.includes(picked)) setPicked(nutrients[0]);
  }, [nutrients, picked]);

  if (!data) {
    return (
      <Section title="제품별 기여도">
        <Empty>분석 대기 중입니다.</Empty>
      </Section>
    );
  }

  const items = (data.contributions[picked] ?? []).map((c) => ({
    name: c.product_name,
    value: c.daily_nutrient_mg,
    share: c.share_pct,
  }));
  const top = items[0];

  return (
    <Section
      title="제품별 기여도"
      sub="선택한 영양소의 하루 총량을 제품별로 분해합니다"
      right={
        <select className="input" style={{ width: 140 }} value={picked} onChange={(e) => setPicked(e.target.value)}>
          {nutrients.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      }
    >
      {items.length === 0 ? (
        <Empty>선택한 영양소 데이터가 없습니다.</Empty>
      ) : (
        <div className="stack" style={{ gap: "var(--sp-3)" }}>
          <ContributionStack items={items} />
          {top && (
            <div className="section-sub">
              {picked} 총량에서 <strong>{top.name}</strong>의 기여도가{" "}
              <strong>{Math.round(top.share)}%</strong>로 가장 큽니다 ({mg(top.value)} mg).
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
