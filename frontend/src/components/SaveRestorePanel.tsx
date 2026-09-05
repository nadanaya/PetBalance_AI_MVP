import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Pet } from "../api/types";
import { useSession } from "../state/session";
import { Button, Notice, Section } from "./ui";

export function SaveRestorePanel() {
  const { state, allProducts, selections, dispatch } = useSession();
  const [pets, setPets] = useState<Pet[]>([]);
  const [pick, setPick] = useState<number | "">("");
  const [msg, setMsg] = useState<{ tone: "info" | "warn"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    api
      .listPets()
      .then(setPets)
      .catch(() => setPets([]));

  useEffect(() => {
    refresh();
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.saveSession({
        profile: {
          name: state.profile.name,
          weight_kg: state.profile.weight,
          age: state.profile.age,
          breed: state.profile.breed,
          neutered: state.profile.neutered,
        },
        products: allProducts,
        selections,
      });
      setMsg({ tone: "info", text: `저장 완료 · 펫 ID ${res.pet_id} · 제품 ${res.saved_products}개` });
      refresh();
    } catch (e) {
      setMsg({ tone: "warn", text: `저장 실패: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (pick === "") return;
    setBusy(true);
    setMsg(null);
    try {
      const data = await api.restoreSession(Number(pick));
      dispatch({
        type: "restore",
        profile: {
          name: data.profile.name,
          weight: data.profile.weight_kg,
          breed: data.profile.breed,
          neutered: data.profile.neutered,
        },
        products: data.products,
        selections: data.selections,
      });
      setMsg({ tone: "info", text: `펫 ID ${pick}의 식단을 불러왔습니다.` });
    } catch (e) {
      setMsg({ tone: "warn", text: `불러오기 실패: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title="저장 · 복원"
      sub="현재 프로필·제품·급여량을 로컬 SQLite에 저장하고 다시 불러옵니다"
    >
      <div className="stack" style={{ gap: "var(--sp-3)" }}>
        <div className="row row-wrap">
          <Button variant="primary" onClick={save} disabled={busy}>
            현재 식단 저장
          </Button>
          <select
            className="input"
            style={{ width: 220 }}
            value={pick}
            onChange={(e) => setPick(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">저장된 프로필 선택…</option>
            {pets.map((p) => (
              <option key={p.pet_id} value={p.pet_id}>
                #{p.pet_id} {p.name} · {p.weight_kg}kg
              </option>
            ))}
          </select>
          <Button onClick={restore} disabled={busy || pick === ""}>
            불러오기
          </Button>
        </div>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      </div>
    </Section>
  );
}
