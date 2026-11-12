/** ブランド名の長さに応じて枠内に収まる文字サイズ（Tailwind class）を選ぶ */
export function getBrandWordmarkTextClass(brand: string): string {
  const len = brand.trim().length;
  if (len >= 10) return "text-sm";
  if (len >= 7) return "text-base";
  return "text-lg";
}
