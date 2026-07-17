"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function enrollInCourse(courseId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .insert({ user_id: user.id, course_id: courseId });
  // Ignore unique-violation (already enrolled).
  if (error && error.code !== "23505") {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/courses/${courseId}`);
  return { ok: true as const };
}

export async function unenroll(courseId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("user_id", user.id)
    .eq("course_id", courseId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath(`/courses/${courseId}`);
  return { ok: true as const };
}

/** Mark a chapter complete (upsert) or incomplete (delete). */
export async function setChapterComplete(
  chapterId: string,
  completed: boolean,
  courseId: string,
) {
  const user = await requireUser();
  const supabase = await createClient();

  if (completed) {
    const { error } = await supabase
      .from("progress")
      .upsert(
        { user_id: user.id, chapter_id: chapterId, completed: true },
        { onConflict: "user_id,chapter_id" },
      );
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase
      .from("progress")
      .delete()
      .eq("user_id", user.id)
      .eq("chapter_id", chapterId);
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/courses/${courseId}`);
  return { ok: true as const };
}
