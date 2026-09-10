import type { ColumnRelatedProduct } from "@/lib/columns";
import { findEarphoneByBrandAndName } from "@/lib/earphones-data";
import type { Earphone } from "@/types/database";

export function getRelatedEarphones(
  products: ColumnRelatedProduct[],
): Earphone[] {
  if (products.length === 0) {
    return [];
  }

  const earphones: Earphone[] = [];

  for (const { name, brand } of products) {
    const earphone = findEarphoneByBrandAndName(brand, name);
    if (earphone) {
      earphones.push(earphone);
    }
  }

  return earphones;
}
