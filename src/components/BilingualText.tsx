import type { BilingualCopy } from "@/lib/diagnose/copy";

type BilingualTextProps = {
  copy: BilingualCopy;
  /** 見出し・本文など用途に応じたサイズ */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  /** 英語行の追加クラス（色など） */
  enClassName?: string;
  /** 日本語行の追加クラス */
  jaClassName?: string;
  className?: string;
  id?: string;
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "legend";
};

const SIZE: Record<
  NonNullable<BilingualTextProps["size"]>,
  { en: string; ja: string }
> = {
  xs: { en: "text-xs leading-snug", ja: "text-[11px] leading-snug" },
  sm: { en: "text-sm leading-snug", ja: "text-xs leading-snug" },
  md: { en: "text-base leading-snug sm:text-lg", ja: "text-sm leading-snug" },
  lg: {
    en: "text-lg leading-snug sm:text-xl",
    ja: "text-sm leading-snug sm:text-base",
  },
  xl: {
    en: "text-xl font-semibold tracking-tight sm:text-2xl",
    ja: "text-sm leading-snug sm:text-base",
  },
  "2xl": {
    en: "text-2xl font-semibold tracking-tight sm:text-3xl",
    ja: "text-base leading-snug sm:text-lg",
  },
  "3xl": {
    en: "text-3xl font-semibold tracking-tight sm:text-4xl",
    ja: "mt-1 text-base leading-snug text-gray-600 sm:text-lg",
  },
};

/**
 * 英語を上・日本語を下に常時スタック表示（案A）。
 * 米訪問者向けに英語を主、日本語は一段控えめだが小さくしすぎない。
 */
export function BilingualText({
  copy,
  size = "sm",
  enClassName = "",
  jaClassName = "",
  className = "",
  id,
  as: Tag = "span",
}: BilingualTextProps) {
  const sizes = SIZE[size];

  return (
    <Tag id={id} className={`flex flex-col gap-0.5 ${className}`.trim()}>
      <span className={`${sizes.en} ${enClassName}`.trim()}>{copy.en}</span>
      <span
        className={`${sizes.ja} text-gray-500 ${jaClassName}`.trim()}
        lang="ja"
      >
        {copy.ja}
      </span>
    </Tag>
  );
}

/** ボタン内など、中央揃えの2行ラベル */
export function BilingualButtonLabel({
  copy,
  inverted = false,
}: {
  copy: BilingualCopy;
  /** 塗りボタン用（白系テキスト） */
  inverted?: boolean;
}) {
  return (
    <span className="flex flex-col items-center gap-0.5 leading-tight">
      <span className="text-sm font-medium">{copy.en}</span>
      <span
        className={`text-xs ${inverted ? "text-white/85" : "text-current/70"}`}
        lang="ja"
      >
        {copy.ja}
      </span>
    </span>
  );
}
