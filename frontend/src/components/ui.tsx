import type { ReactNode } from "react";
import type { StatusKind } from "../lib/format";

export function Card({
  children,
  className = "",
  pad = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`card ${pad ? "card-pad" : ""} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Section({
  title,
  sub,
  right,
  children,
  className = "",
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="row spread" style={{ marginBottom: "var(--sp-4)" }}>
        <div>
          <div className="section-title">{title}</div>
          {sub && <div className="section-sub">{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </Card>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "default",
  size,
  ...rest
}: {
  children: ReactNode;
  variant?: "default" | "primary" | "ghost";
  size?: "sm";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = [
    "btn",
    variant === "primary" && "btn-primary",
    variant === "ghost" && "btn-ghost",
    size === "sm" && "btn-sm",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Badge({
  kind,
  icon,
  children,
}: {
  kind: StatusKind;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <span className={`badge badge-${kind}`}>
      {icon && <span aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}

export function Stat({
  k,
  v,
  hint,
}: {
  k: string;
  v: ReactNode;
  hint?: string;
}) {
  return (
    <div className="stat">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
      {hint && <span className="section-sub">{hint}</span>}
    </div>
  );
}

export function Notice({
  tone = "info",
  icon,
  children,
}: {
  tone?: "info" | "warn";
  icon?: string;
  children: ReactNode;
}) {
  return (
    <div className={`notice notice-${tone === "warn" ? "warn" : "info"}`}>
      <span className="ic" aria-hidden>
        {icon ?? (tone === "warn" ? "⚠" : "ⓘ")}
      </span>
      <div>{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
