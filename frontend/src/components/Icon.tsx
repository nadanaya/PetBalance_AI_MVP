/** 단색 라인 아이콘 (16px, currentColor). 시중 앱 톤에 맞춘 일관 세트. */
export type IconName =
  | "bowl"
  | "plus"
  | "swap"
  | "tag"
  | "list"
  | "printer"
  | "book"
  | "gear"
  | "paw"
  | "back";

const P: Record<IconName, string> = {
  bowl: "M3 11h18a9 9 0 0 1-18 0Zm2.5-1.2C6 6.5 8.7 4 12 4s6 2.5 6.5 5.8M12 4V2",
  plus: "M12 5v14M5 12h14",
  swap: "M7 7h11l-3-3M17 17H6l3 3",
  tag: "M20.6 13.4 13 21a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 2.6 12L10 4.4A2 2 0 0 1 11.4 4H19a2 2 0 0 1 2 2v7.4a2 2 0 0 1-.4 1.4ZM7.5 7.5h.01",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  printer: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6Z",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  paw: "M11 14c-2.5 0-4 2-4 3.5S8 20 11 20s4-1 4-2.5S13.5 14 11 14ZM6 11a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 6 11ZM16 11a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 16 11ZM9 8a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 9 8ZM13 8a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 13 8Z",
  back: "M19 12H5M12 19l-7-7 7-7",
};

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={P[name]} />
    </svg>
  );
}
