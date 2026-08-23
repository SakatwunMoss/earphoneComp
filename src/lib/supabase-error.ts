import type { PostgrestError } from "@supabase/supabase-js";

export function formatSupabaseError(error: PostgrestError): {
  message: string;
  details: string | null;
  hint: string | null;
  code: string | null;
} {
  return {
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
    code: error.code ?? null,
  };
}

export function logSupabaseError(context: string, error: PostgrestError): void {
  console.error(context, formatSupabaseError(error));
}
