import type { ColumnRelatedProduct } from "@/lib/columns";
import { logSupabaseError } from "@/lib/supabase-error";
import { supabase } from "@/lib/supabase";
import type { Earphone } from "@/types/database";

export async function getRelatedEarphones(
  products: ColumnRelatedProduct[],
): Promise<Earphone[]> {
  if (!supabase || products.length === 0) {
    return [];
  }

  const earphones: Earphone[] = [];

  for (const { name, brand } of products) {
    const { data, error } = await supabase
      .from("earphones")
      .select("*")
      .eq("brand", brand)
      .eq("name", name)
      .maybeSingle();

    if (error) {
      logSupabaseError(
        `Failed to fetch related earphone (${brand} / ${name}):`,
        error,
      );
      continue;
    }

    if (data) {
      earphones.push(data);
    }
  }

  return earphones;
}
