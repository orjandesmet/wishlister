import type { PostgrestError } from "@supabase/supabase-js";

/** Unwraps a Supabase response, turning its error into a thrown Error. */
export function must<T>({ data, error }: { data: T | null; error: PostgrestError | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}
