type PromotionNoteProps = {
  className?: string;
};

export function PromotionNote({ className = "" }: PromotionNoteProps) {
  return (
    <p
      role="note"
      className={`rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2.5 text-sm font-medium text-gray-700 ${className}`}
    >
      本ページはプロモーションを含みます。
    </p>
  );
}
