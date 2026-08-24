type PriceDisclaimerProps = {
  className?: string;
};

export function PriceDisclaimer({ className = "" }: PriceDisclaimerProps) {
  return (
    <p
      role="note"
      className={`flex gap-2 rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2.5 text-sm leading-relaxed text-gray-600 ${className}`}
    >
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-semibold text-teal-700"
      >
        i
      </span>
      <span>
        表示価格は記事作成時点のものです。価格は変動する場合がありますので、最新の価格は各商品の販売ページでご確認ください。
      </span>
    </p>
  );
}
