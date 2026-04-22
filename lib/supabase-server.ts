import { createClient } from "@supabase/supabase-js";

// Server-side only — uses the service role key to bypass RLS.
// NEVER import this file in browser/client components.
// Lazy initialization to avoid errors during build time when env vars aren't available
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      );
    }

    supabaseAdminInstance = createClient(url, key);
  }
  return supabaseAdminInstance;
}

// Export for backward compatibility - will be lazily initialized
export const supabaseAdmin = {
  from: (table: string) => getSupabaseAdmin().from(table),
  rpc: (fn: string, params?: any) => getSupabaseAdmin().rpc(fn, params),
} as any;
