import { useSession } from "../state/session";
import { costRows } from "../lib/calc";
import { won } from "../lib/format";
import { MiniBars } from "./charts";
import { Empty, Section, Stat } from "./ui";

export function CostPanel() {
  const { allProducts, selections } = useSession();
  const rows = costRows(allProducts, selections);
  const totalDaily = rows.reduce((a, b) => a + b.daily_cost, 0);
  const totalMonthly = rows.reduce((a, b) => a + b.monthly_cost, 0);

  return (
    <Section
      title="월 예상 비용"
      sub="라벨 기준량 대비 실제 하루 급여량 비율로 산정 · 가격은 데모 데이터"
    >
      {rows.length === 0 ? (
        <Empty>가격이 등록된 활성 제품이 없습니다.</Empty>
      ) : (
        <div className="stack" style={{ gap: "var(--sp-4)" }}>
          <div className="stat-row">
            <Stat k="총 일일 비용" v={won(totalDaily)} />
            <Stat k="총 월간 비용" v={won(totalMonthly)} />
            <Stat k="유료 제품" v={`${rows.length}개`} />
          </div>
          <MiniBars
            items={rows.map((r) => ({ name: r.name, value: r.monthly_cost }))}
            format={won}
          />
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>제품</th>
                  <th className="num">하루 급여량</th>
                  <th className="num">라벨 기준</th>
                  <th className="num">일일 비용</th>
                  <th className="num">월간 비용</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.product_id}>
                    <td>{r.name}</td>
                    <td className="num">{r.daily_amount_g} g</td>
                    <td className="num">{r.serving_basis_g} g</td>
                    <td className="num">{won(r.daily_cost)}</td>
                    <td className="num">{won(r.monthly_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Section>
  );
}
