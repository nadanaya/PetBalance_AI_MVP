import { useEffect, useState } from "react";
import { api } from "../api/client";
import { mg } from "../lib/format";
import { Button, Field, Section } from "./ui";

export function UnitConverter() {
  const [value, setValue] = useState(1.2);
  const [unit, setUnit] = useState("%");
  const [nutrient, setNutrient] = useState("칼슘");
  const [serving, setServing] = useState(100);
  const [perPack, setPerPack] = useState(1);
  const [units, setUnits] = useState<string[]>([
    "%", "mg", "g", "µg", "mg/kg", "ppm", "IU", "IU/kg", "mg/정",
  ]);
  const [out, setOut] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.supportedUnits().then((r) => setUnits(r.supported)).catch(() => {});
  }, []);

  async function convert() {
    setErr(null);
    try {
      const r = await api.convertUnit({
        value,
        unit,
        nutrient,
        serving_basis_g: serving,
        servings_per_pack: perPack,
      });
      setOut(r.mg);
    } catch (e) {
      setOut(null);
      setErr(String((e as Error).message || e));
    }
  }

  return (
    <Section
      title="단위 변환기"
      sub="라벨 표기(%, mg/kg, IU/kg, mg/정 …)를 기준량당 mg 으로 환산합니다 · F-011"
    >
      <div className="stack" style={{ gap: "var(--sp-3)" }}>
        <div className="grid-2" style={{ gap: "var(--sp-3)" }}>
          <Field label="값">
            <input
              className="input"
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </Field>
          <Field label="단위">
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {units.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="영양소 (IU 계열에 필요)">
            <input
              className="input"
              value={nutrient}
              onChange={(e) => setNutrient(e.target.value)}
            />
          </Field>
          <Field label="라벨 기준량 (g)">
            <input
              className="input"
              type="number"
              step="any"
              value={serving}
              onChange={(e) => setServing(Number(e.target.value))}
            />
          </Field>
          <Field label="1회분 개수 (mg/정 계열)">
            <input
              className="input"
              type="number"
              step="any"
              value={perPack}
              onChange={(e) => setPerPack(Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="row">
          <Button variant="primary" onClick={convert}>
            환산
          </Button>
          {out != null && (
            <strong style={{ fontSize: 15 }}>
              = {mg(out, 5)} mg / 기준량
            </strong>
          )}
          {err && <span className="badge badge-warning">{err}</span>}
        </div>
      </div>
    </Section>
  );
}
