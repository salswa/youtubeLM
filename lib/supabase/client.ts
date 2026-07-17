import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client (uses the publishable key — safe in the browser). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
