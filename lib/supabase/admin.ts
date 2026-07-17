import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client using the SECRET key. Bypasses RLS.
 * SERVER ONLY — never import this into a client component or expose the key.
 * Used by the Phase 3 AI pipeline to write transcripts/summaries/quizzes.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
