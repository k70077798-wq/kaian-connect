import { createClient } from "@supabase/supabase-js";

// Lazy public Supabase client for MCP tool handlers. Uses the publishable
// (anon) key — RLS still applies, so only public data is exposed.
export function getPublicSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
