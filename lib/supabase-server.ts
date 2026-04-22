import { createClient } from "@supabase/supabase-js";

// Server-side only — uses the service role key to bypass RLS.
// NEVER import this file in browser/client components.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
