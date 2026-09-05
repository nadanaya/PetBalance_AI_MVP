import { useState } from "react";
import { useSession } from "../state/session";
import type { Product } from "../api/types";
import { Button, Notice, Section } from "./ui";

import { parseHandoff } from "../lib/handoff";

export function HandoffImport() {
  const { dispatch } = useSession();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ tone: "info" | "warn"; text: string } | null>(null);

  function load() {
    setMsg(null);
    try {
      const p = parseHandoff(code);
      const products: Product[] = p.feeding.map((f, i) => ({
        product_id: `handoff_${i}_${Math.random().toString(16).slice(2, 6)}`,
        name: f.name,
        brand: f.brand || null,
        category: f.category,
        serving_basis_g: f.servingBasisG,
        monthly_price_krw: f.monthlyPriceKrw || 0,
        label_complete: f.labelComplete === true,
        source: "handoff",
        nutrients: (f.nutrients || []).map((n) => ({
          nutrient: n.nutrient,
          amount_mg: n.amountMg,
          label_complete: f.labelComplete === true,
        })),
      }));
      const selections = products.map((pr, i) => ({
        product_id: pr.product_id,
        daily_amount_g: p.feeding[i].g,
        active: true,
      }));
      dispatch({
        type: "restore",
        profile: {
          name: p.animal.name,
          weight: p.animal.weightKg,
          age: p.animal.ageYears,
          breed: "",
          neutered: false,
          healthNotes: p.animal.healthNotes || "", shelter: p.shelter || "", cage: p.animal.cage || "", arrival: p.animal.arrival || "", shelterStatus: p.animal.status || "",
        },
        products,
        selections,
      });
      setCode("");
      setMsg({
        tone: "info",
        text:
          `${p.animal.name}의 식단을 불러왔습니다 (제품 ${products.length}개` +
          (p.shelter ? ` · ${p.shelter}` : "") +
          "). ‘급여조합’ 탭에서 확인하세요.",
      });
    } catch (e) {
      setMsg({ tone: "warn", text: String((e as Error).message || e) });
    }
  }

  return (
    <Section
      title="보호소에서 받은 자료 불러오기"
      sub="입양처에서 받은 인수인계 코드를 붙여넣으면 현재 프로필과 급여조합을 받은 자료로 교체합니다."
    >
      <div className="stack" style={{ gap: "var(--sp-3)" }}>
        <textarea
          className="input"
          aria-label="보호소 인수인계 코드"
          rows={3}
          placeholder="보호소 담당자가 준 인수인계 코드를 붙여넣으세요"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="row">
          <Button variant="primary" onClick={load} disabled={!code.trim()}>
            불러오기
          </Button>
        </div>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      </div>
    </Section>
  );
}

