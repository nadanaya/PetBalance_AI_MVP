import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { StandardRow } from "../api/types";
import { mg } from "../lib/format";
import { Section } from "./ui";

export function StandardsInfo() {
  const [rows, setRows] = useState<StandardRow[]>([]);
  useEffect(() => {
    api.catalogStandards().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <Section
      title="영양 기준표 출처"
      sub="현재 적용 중인 참고 기준의 근거·버전·산정 방식 · F-024 / F-034"
    >
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>영양소</th>
              <th className="num">참고 최소</th>
              <th className="num">참고 최대</th>
              <th>출처 · 버전</th>
              <th>산정 방식</th>
              <th>검증</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.nutrient}>
                <td>{r.nutrient}</td>
                <td className="num">{mg(r.demo_min_mg)}</td>
                <td className="num">{mg(r.demo_max_mg)}</td>
                <td>
                  {r.source_url ? (
                    <a href={r.source_url} target="_blank" rel="noreferrer">
                      {r.source}
                    </a>
                  ) : (
                    r.source
                  )}
                  {r.version && <span className="muted"> · {r.version}</span>}
                </td>
                <td className="section-sub">{r.basis}</td>
                <td>
                  <span
                    className={`badge ${
                      r.verified ? "badge-ok" : "badge-neutral"
                    }`}
                  >
                    {r.verified ? "검증됨" : "미검증"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="section-sub" style={{ marginTop: "var(--sp-3)" }}>
        값은 AAFCO 성견 유지기 프로파일을 10kg·600kcal/day 기준으로 환산한 데모이며,
        수의영양학 검토 전까지 실제 급여 판단에 사용할 수 없습니다.
      </p>
    </Section>
  );
}
