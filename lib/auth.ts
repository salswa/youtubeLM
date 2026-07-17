import "server-only";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function hasSupabaseEnv() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

/** Returns the current authenticated user, or null (also null if env not yet configured). */
export async function getUser() {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Use in server components/actions that require auth — redirects to /login otherwise. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
