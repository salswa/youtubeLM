"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getAuthoredCount, MAX_COURSES } from "@/lib/data/courses";

export async function createCourse() {
  const user = await requireUser();

  const count = await getAuthoredCount(user.id);
  if (count >= MAX_COURSES) {
    return {
      ok: false as const,
      error: `You can create up to ${MAX_COURSES} courses.`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({ author_id: user.id, title: "Untitled course" })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true as const, id: data.id as string };
}

export async function deleteCourse(courseId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const };
}
