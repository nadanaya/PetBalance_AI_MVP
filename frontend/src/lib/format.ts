export const won = (n: number) =>
  `${Math.round(n).toLocaleString("ko-KR")}원`;

export function mg(n: number, digits = 3): string {
  if (!isFinite(n)) return "—";
  if (n === 0) return "0";
  if (n < 0.001) return n.toExponential(2);
  return n.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export const pct = (n: number, digits = 1) =>
  `${(n * 100).toLocaleString("ko-KR", { maximumFractionDigits: digits })}%`;

export type StatusKind = "ok" | "warning" | "serious" | "critical" | "info" | "neutral";

export function statusMeta(status: string): {
  kind: StatusKind;
  icon: string;
  label: string;
} {
  switch (status) {
    case "정보 충분":
      return { kind: "ok", icon: "✓", label: "정보 충분" };
    case "중복 가능":
      return { kind: "warning", icon: "▲", label: "중복 가능" };
    case "기준 초과 가능":
      return { kind: "critical", icon: "●", label: "기준 초과 가능" };
    case "참고 범위 미만":
      return { kind: "info", icon: "▽", label: "참고 범위 미만" };
    case "정보 부족":
      return { kind: "neutral", icon: "○", label: "정보 부족" };
    default:
      return { kind: "neutral", icon: "○", label: status };
  }
}

export const SERIES_VARS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
];
