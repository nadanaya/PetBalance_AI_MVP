import { useSession } from "../state/session";
import { Stat } from "./ui";

export function MetricsRow() {
  const { state, selections, analysis } = useSession();
  const summary = analysis.data?.summary ?? [];
  const activeCount = selections.filter((s) => s.active).length;
  const warnCount = summary.filter((r) =>
    ["중복 가능", "기준 초과 가능"].includes(r.status),
  ).length;
  const gapCount = summary.filter((r) => r.status === "정보 부족").length;

  return (
    <div className="stat-row">
      <Stat k="활성 제품" v={`${activeCount}개`} />
      <Stat k="확인 필요" v={`${warnCount}개`} hint="중복·기준 초과 가능" />
      <Stat k="정보 부족" v={`${gapCount}개`} hint="라벨 미표기 영양소" />
      <Stat k="프로필" v={`${state.profile.age}세 · ${state.profile.weight.toFixed(1)}kg`} />
      <Stat k="품종" v={state.profile.breed || "미입력"} />
    </div>
  );
}
