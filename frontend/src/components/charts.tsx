import { SERIES_VARS, mg, pct, type StatusKind } from "../lib/format";

const KIND_VAR: Record<StatusKind, string> = {
  ok: "var(--ok)",
  warning: "var(--warning)",
  serious: "var(--serious)",
  critical: "var(--critical)",
  info: "var(--info)",
  neutral: "var(--neutral)",
};

/**
 * 영양소 1개 = 막대 1개. 길이는 (총량 / 축최대), 색은 상태.
 * 참고 최소~최대 구간을 해치 밴드로, 참고 최대를 실선으로 표시한다.
 * 상태는 색 + 별도 배지(아이콘·라벨)로 이중 인코딩한다.
 */
export function NutrientBar({
  label,
  total,
  min,
  max,
  axisMax,
  kind,
  valueText,
}: {
  label: string;
  total: number;
  min: number;
  max: number;
  axisMax: number;
  kind: StatusKind;
  valueText: string;
}) {
  const w = (v: number) => `${Math.min(100, (v / axisMax) * 100)}%`;
  return (
    <div
      className="bar-row"
      title={`${label} · 추정 ${mg(total)} mg/day · 참고 ${mg(min)}~${mg(max)} mg`}
    >
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <span
          className="bar-band"
          style={{ left: w(min), width: `calc(${w(max)} - ${w(min)})` }}
        />
        <span
          className="bar-fill"
          style={{ width: w(total), background: KIND_VAR[kind] }}
        />
        <span className="bar-ref" style={{ left: w(max) }} />
      </div>
      <span className="bar-value">{valueText}</span>
    </div>
  );
}

/** 제품별 기여도 = 하나의 가로 누적 막대 + 범례 + 직접 라벨. */
export function ContributionStack({
  items,
}: {
  items: { name: string; value: number; share: number }[];
}) {
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div>
      <div className="stacked" role="img" aria-label="제품별 기여도 누적 막대">
        {items.map((it, i) => (
          <span
            key={it.name}
            style={{
              width: `${(it.value / total) * 100}%`,
              background: SERIES_VARS[i % SERIES_VARS.length],
            }}
            title={`${it.name} · ${mg(it.value)} mg · ${pct(it.share / 100)}`}
          />
        ))}
      </div>
      <div className="legend">
        {items.map((it, i) => (
          <span className="item" key={it.name}>
            <span
              className="swatch"
              style={{ background: SERIES_VARS[i % SERIES_VARS.length] }}
            />
            {it.name} <span className="muted">{pct(it.share / 100)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** 제외 전 → 후 변화. 덤벨(before ●—● after) 한 행. */
export function DumbbellRow({
  label,
  before,
  after,
  axisMax,
}: {
  label: string;
  before: number;
  after: number;
  axisMax: number;
}) {
  const p = (v: number) => `${Math.min(100, (v / axisMax) * 100)}%`;
  const lo = Math.min(before, after);
  const hi = Math.max(before, after);
  const dropped = after < before;
  return (
    <div
      className="bar-row"
      title={`${label} · ${mg(before)} → ${mg(after)} mg`}
    >
      <span className="bar-label">{label}</span>
      <div className="bar-track" style={{ background: "var(--surface-3)" }}>
        <span
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            height: 3,
            left: p(lo),
            width: `calc(${p(hi)} - ${p(lo)})`,
            background: dropped ? "var(--info)" : "var(--serious)",
            borderRadius: 2,
          }}
        />
        <Dot left={p(before)} color="var(--text-muted)" />
        <Dot left={p(after)} color={dropped ? "var(--info)" : "var(--serious)"} />
      </div>
      <span className="bar-value">
        {mg(before)} → {mg(after)}
      </span>
    </div>
  );
}

function Dot({ left, color }: { left: string; color: string }) {
  return (
    <span
      style={{
        position: "absolute",
        top: "50%",
        left,
        width: 11,
        height: 11,
        marginLeft: -5,
        marginTop: -5,
        borderRadius: "50%",
        background: color,
        boxShadow: "0 0 0 2px var(--surface-1)",
      }}
    />
  );
}

/** 비용 등 단순 크기 비교. 파랑 단일 색(sequential). */
export function MiniBars({
  items,
  format,
}: {
  items: { name: string; value: number }[];
  format: (n: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div>
      {items.map((it) => (
        <div className="bar-row" key={it.name} title={`${it.name} · ${format(it.value)}`}>
          <span className="bar-label">{it.name}</span>
          <div className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${(it.value / max) * 100}%`, background: "var(--series-1)" }}
            />
          </div>
          <span className="bar-value">{format(it.value)}</span>
        </div>
      ))}
    </div>
  );
}
