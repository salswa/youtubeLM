"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { courseSchema } from "@/lib/schemas/course";
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

export async function updateCourseMeta(
  courseId: string,
  input: { title: string; description?: string; subject?: string },
) {
  await requireUser();
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      subject: parsed.data.subject,
    })
    .eq("id", courseId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/courses/${courseId}/edit`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteCourse(courseId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function setPublishStatus(
  courseId: string,
  status: "draft" | "published",
) {
  await requireUser();
  const supabase = await createClient();

  if (status === "published") {
    // Require at least one chapter before going public.
    const { data: course } = await supabase
      .from("courses")
      .select("title, units(id, chapters(id))")
      .eq("id", courseId)
      .single();

    const chapters =
      (course?.units as { chapters?: unknown[] }[] | null)?.reduce(
        (n, u) => n + (u.chapters?.length ?? 0),
        0,
      ) ?? 0;

    if (!course?.title?.trim()) {
      return { ok: false as const, error: "Add a course title first." };
    }
    if (chapters === 0) {
      return { ok: false as const, error: "Add at least one chapter first." };
    }
  }

  const { error } = await supabase
    .from("courses")
    .update({ status })
    .eq("id", courseId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/courses/${courseId}/edit`);
  revalidatePath("/dashboard");
  revalidatePath("/courses");
  return { ok: true as const };
}
