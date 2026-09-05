import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { OcrDraft, Product } from "../api/types";
import { useSession } from "../state/session";
import { Button, Field, Notice, Section } from "./ui";
import { CameraCapture } from "./CameraCapture";

interface DraftRow {
  nutrient: string;
  amount_mg: number;
}

export function LabelOcrPanel() {
  const { dispatch } = useSession();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [caps, setCaps] = useState<{ image_ocr: boolean; vision: boolean } | null>(null);
  useEffect(() => {
    api.ocrAvailable().then(setCaps).catch(() => setCaps(null));
  }, []);

  const [draft, setDraft] = useState<OcrDraft | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("영양제");
  const [serving, setServing] = useState(100);
  const [price, setPrice] = useState(0);
  const [complete, setComplete] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([]);

  async function extract() {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.ocrDraft({ text: text.trim() || undefined, file: file || undefined });
      setDraft(d);
      setName(d.product_name);
      setCategory(d.categories.includes(d.category) ? d.category : "영양제");
      setServing(d.serving_basis_g);
      setComplete(d.label_complete);
      setRows(
        d.nutrients.length
          ? d.nutrients.map((n) => ({ nutrient: n.nutrient, amount_mg: n.amount_mg }))
          : [{ nutrient: "", amount_mg: 0 }],
      );
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setErr(null);
    try {
      const product: Product = await api.ocrConfirm({
        product_name: name,
        category,
        serving_basis_g: serving,
        label_complete: complete,
        monthly_price_krw: price,
        nutrients: rows
          .filter((r) => r.nutrient.trim() && r.amount_mg > 0)
          .map((r) => ({ nutrient: r.nutrient.trim(), amount_mg: r.amount_mg, label_complete: complete })),
      });
      dispatch({ type: "addProduct", product });
      reset();
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDraft(null);
    setText("");
    setFile(null);
    setRows([]);
    setName("");
  }

  return (
    <Section
      title="라벨로 제품 추가 (OCR 초안)"
      sub="사진·텍스트에서 후보값만 추출합니다. 확인 버튼을 눌러야 조합에 반영됩니다."
      right={
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen((v) => !v)}>
          {open ? "접기" : "펼치기"}
        </button>
      }
    >
      {!open ? (
        <div className="section-sub">
          OCR 결과는 자동 확정하지 않습니다. 미표기 영양소는 ‘정보 부족’으로 보수적으로 판정합니다.
        </div>
      ) : (
        <div className="stack" style={{ gap: "var(--sp-4)" }}>
          {!draft && (
            <>
              <div className="grid-2">
                <Field label="라벨 사진">
                  <div className="row" style={{ gap: "var(--sp-2)" }}>
                    <Button onClick={() => setCamOpen(true)}>📷 카메라로 촬영</Button>
                    <label className="btn" style={{ cursor: "pointer" }}>
                      파일 선택
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: "none" }}
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                  {file && (
                    <span className="section-sub" style={{ marginTop: 4 }}>
                      선택됨: {file.name}{" "}
                      <button className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>
                        지우기
                      </button>
                    </span>
                  )}
                </Field>
                <Field label="또는 라벨 텍스트 붙여넣기">
                  <textarea
                    className="input"
                    rows={4}
                    placeholder={"예)\n튼튼 칼슘 영양제\n1일 2정(2g) 기준\n칼슘 420mg\n인 160mg\n비타민D 8µg"}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </Field>
              </div>
              <div className="row">
                <Button variant="primary" onClick={extract} disabled={busy || (!text.trim() && !file)}>
                  {busy ? "읽는 중…" : "초안 추출"}
                </Button>
                <span className="section-sub">
                  {caps?.vision
                    ? "사진은 비전 AI로 영양성분표를 읽습니다."
                    : caps?.image_ocr
                      ? "사진은 내장 OCR로 인식합니다(한글 정확도 제한). 비전 AI를 쓰려면 설정에서 API 키를 등록하세요."
                      : "사진 자동 인식이 꺼져 있습니다. 라벨 텍스트를 붙여넣거나, 설정에서 비전 AI API 키를 등록하세요."}
                </span>
              </div>
              {camOpen && (
                <CameraCapture
                  onCapture={(f) => {
                    setFile(f);
                    setText("");
                  }}
                  onClose={() => setCamOpen(false)}
                />
              )}
            </>
          )}

          {err && <Notice tone="warn">{err}</Notice>}

          {draft && (
            <div className="stack" style={{ gap: "var(--sp-3)" }}>
              <div className="row" style={{ gap: "var(--sp-2)" }}>
                <span className="badge badge-neutral">
                  {draft.engine === "vision"
                    ? "비전 AI 판독"
                    : draft.engine === "tesseract"
                      ? "내장 OCR 판독"
                      : "텍스트 파싱"}
                </span>
                <span className="section-sub">
                  값을 반드시 확인·수정한 뒤 추가하세요. 자동 확정하지 않습니다.
                </span>
              </div>
              {draft.raw_text && (
                <details>
                  <summary className="section-sub">
                    {draft.engine === "vision" ? "판독 메모" : "이미지·입력에서 읽은 원문"}
                  </summary>
                  <pre
                    className="section-sub"
                    style={{ whiteSpace: "pre-wrap", marginTop: 6 }}
                  >
                    {draft.raw_text}
                  </pre>
                </details>
              )}
              <div className="grid-2">
                <Field label="제품명">
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="분류">
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {draft.categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="라벨 기준량 (g)">
                  <input
                    className="input"
                    type="number"
                    min={0.1}
                    step={1}
                    value={serving}
                    onChange={(e) => setServing(Number(e.target.value))}
                  />
                </Field>
                <Field label="월 가격 (원, 선택)">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1000}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </Field>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>영양소</th>
                    <th className="num">함량 (mg)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          className="input"
                          value={r.nutrient}
                          onChange={(e) =>
                            setRows((rs) =>
                              rs.map((x, j) => (j === i ? { ...x, nutrient: e.target.value } : x)),
                            )
                          }
                        />
                      </td>
                      <td className="num">
                        <input
                          className="input"
                          type="number"
                          min={0}
                          step="any"
                          value={r.amount_mg}
                          onChange={(e) =>
                            setRows((rs) =>
                              rs.map((x, j) =>
                                j === i ? { ...x, amount_mg: Number(e.target.value) } : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                className="btn btn-sm"
                onClick={() => setRows((rs) => [...rs, { nutrient: "", amount_mg: 0 }])}
              >
                + 행 추가
              </button>

              {draft.unparsed_lines.length > 0 && (
                <div className="section-sub">
                  확인 불가 줄: {draft.unparsed_lines.join(" · ")}
                </div>
              )}

              <label className="row" style={{ gap: "var(--sp-2)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={complete}
                  onChange={(e) => setComplete(e.target.checked)}
                />
                <span className="secondary">이 라벨의 관련 영양소를 모두 확인했습니다 (미표기 없음)</span>
              </label>

              <div className="row">
                <Button variant="primary" onClick={confirm} disabled={busy}>
                  확인하고 조합에 추가
                </Button>
                <Button variant="ghost" onClick={reset} disabled={busy}>
                  초안 버리기
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
