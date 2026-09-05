import { useSession } from "../state/session";
import { Field, Section } from "./ui";

export function ProfilePanel() {
  const { state, dispatch } = useSession();
  const p = state.profile;
  const set = (patch: Partial<typeof p>) => dispatch({ type: "profile", patch });

  return (
    <Section
      title="반려동물 프로필"
      sub="성견 단일 생애주기 데모 · 질환 정보는 판정에 쓰지 않습니다"
    >
      <div className="stack" style={{ gap: "var(--sp-3)" }}>
        {p.shelter && <div className="section-sub">인수인계 보호소: {p.shelter}{p.cage ? ` · 케이지 ${p.cage}` : ""}{p.arrival ? ` · 입소 ${p.arrival}` : ""}{p.shelterStatus ? ` · ${p.shelterStatus}` : ""}</div>}
        <Field label="건강 특이사항">
          <textarea className="input" aria-label="건강 특이사항" rows={3} value={p.healthNotes || ""} onChange={(e) => set({ healthNotes: e.target.value })} />
        </Field>
        <Field label="이름">
          <input
            className="input"
            value={p.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <div className="grid-2" style={{ gap: "var(--sp-3)" }}>
          <Field label="체중 (kg)">
            <input
              className="input"
              type="number"
              min={1}
              max={80}
              step={0.1}
              value={p.weight}
              onChange={(e) => set({ weight: Number(e.target.value) })}
            />
          </Field>
          <Field label="나이 (세)">
            <input
              className="input"
              type="number"
              min={1}
              max={25}
              value={p.age}
              onChange={(e) => set({ age: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="품종">
          <input
            className="input"
            placeholder="예: 말티즈, 푸들"
            value={p.breed}
            onChange={(e) => set({ breed: e.target.value })}
          />
        </Field>
        <label className="row spread" style={{ cursor: "pointer" }}>
          <span className="secondary">중성화 완료</span>
          <span className="switch">
            <input
              type="checkbox"
              checked={p.neutered}
              onChange={(e) => set({ neutered: e.target.checked })}
            />
            <span className="track" />
          </span>
        </label>
      </div>
    </Section>
  );
}
