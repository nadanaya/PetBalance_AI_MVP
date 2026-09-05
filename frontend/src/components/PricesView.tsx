import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Offer } from "../api/types";
import { useSession } from "../state/session";
import { won } from "../lib/format";
import { Empty, Notice, Section } from "./ui";

export function PricesView() {
  const { allProducts, selections } = useSession();
  const activeIds = new Set(
    selections.filter((s) => s.active).map((s) => s.product_id),
  );
  const products = allProducts.filter((p) => activeIds.has(p.product_id));
  const [byId, setById] = useState<Record<string, { offers: Offer[]; lowest: number | null }>>(
    {},
  );

  useEffect(() => {
    products.forEach((p) => {
      if (byId[p.product_id]) return;
      api
        .prices(p.product_id)
        .then((r) =>
          setById((m) => ({
            ...m,
            [p.product_id]: { offers: r.offers, lowest: r.lowest_price_krw },
          })),
        )
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.map((p) => p.product_id).join(",")]);

  return (
    <Section
      title="최저가 비교"
      sub="활성 제품의 판매처별 가격(월 환산). 데모 가격표(prices.csv) 기반 · F-021"
    >
      <Notice tone="info">
        가격은 데모 데이터입니다. 실제 오픈마켓 연동은 <code>PriceProvider</code> 어댑터를
        교체하면 됩니다.
      </Notice>
      {products.length === 0 ? (
        <Empty>활성 제품이 없습니다.</Empty>
      ) : (
        <div className="stack" style={{ gap: "var(--sp-4)", marginTop: "var(--sp-4)" }}>
          {products.map((p) => {
            const entry = byId[p.product_id];
            return (
              <div key={p.product_id}>
                <div className="row spread">
                  <strong>
                    {p.name}
                    {p.brand && <span className="muted"> · {p.brand}</span>}
                  </strong>
                  {entry?.lowest != null && (
                    <span className="badge badge-ok">최저 {won(entry.lowest)}</span>
                  )}
                </div>
                {!entry ? (
                  <div className="skeleton" style={{ height: 36, marginTop: 6 }} />
                ) : entry.offers.length === 0 ? (
                  <div className="section-sub">등록된 가격이 없습니다.</div>
                ) : (
                  <table className="table" style={{ marginTop: 6 }}>
                    <thead>
                      <tr>
                        <th>판매처</th>
                        <th className="num">가격</th>
                        <th>업데이트</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {entry.offers.map((o, i) => (
                        <tr key={o.vendor}>
                          <td>
                            {o.vendor}
                            {i === 0 && (
                              <span className="badge badge-ok" style={{ marginLeft: 6 }}>
                                최저
                              </span>
                            )}
                          </td>
                          <td className="num">{won(o.price_krw)}</td>
                          <td className="muted">{o.updated_at}</td>
                          <td>
                            <a href={o.url} target="_blank" rel="noreferrer">
                              보기 ↗
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
