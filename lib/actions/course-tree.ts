"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  extractYoutubeId,
  canonicalYoutubeUrl,
  courseSchema,
} from "@/lib/schemas/course";
import { getCourseTree } from "@/lib/data/courses";
import { getAuthorAiContent, type AuthorAiContent } from "@/lib/data/ai";
import type { CourseTree, PublishedTree, PublishedQuiz } from "@/lib/types";

export interface SaveChapterInput {
  id: string;
  title: string;
  description: string;
  youtube_url: string | null;
}
export interface SaveUnitInput {
  id: string;
  title: string;
  description: string;
  chapters: SaveChapterInput[];
}
export interface SaveCourseTreeInput {
  meta: { title: string; description: string; subject: string };
  units: SaveUnitInput[];
}

/**
 * Bulk-save the entire builder tree in one call. New units/chapters carry
 * client-generated UUIDs, so this is a pure upsert + delete-missing. If a
 * chapter's video changes while it was already AI-`ready`, it is marked `stale`
 * so the next Generate-AI pass reprocesses just that chapter.
 */
export async function saveCourseTree(
  courseId: string,
  input: SaveCourseTreeInput,
) {
  await requireUser();
  const supabase = await createClient();

  const meta = courseSchema.safeParse(input.meta);
  if (!meta.success) {
    return { ok: false as const, error: meta.error.issues[0].message };
  }

  const { data: courseRow } = await supabase
    .from("courses")
    .select("status")
    .eq("id", courseId)
    .single();
  const isPublished = courseRow?.status === "published";

  // Existing rows (to detect deletions).
  const { data: existingUnits } = await supabase
    .from("units")
    .select("id")
    .eq("course_id", courseId);
  const existingUnitIds = (existingUnits ?? []).map((u) => u.id);

  const { data: existingChapters } = existingUnitIds.length
    ? await supabase
        .from("chapters")
        .select("id")
        .in("unit_id", existingUnitIds)
    : { data: [] as { id: string }[] };

  // Update course meta (+ mark dirty-since-publish).
  const { error: metaErr } = await supabase
    .from("courses")
    .update({
      title: meta.data.title,
      description: meta.data.description,
      subject: meta.data.subject,
      ...(isPublished ? { has_unpublished_changes: true } : {}),
    })
    .eq("id", courseId);
  if (metaErr) return { ok: false as const, error: metaErr.message };

  // Upsert units.
  const unitRows = input.units.map((u, i) => ({
    id: u.id,
    course_id: courseId,
    title: u.title,
    description: u.description ?? "",
    position: i,
  }));
  if (unitRows.length) {
    const { error } = await supabase.from("units").upsert(unitRows);
    if (error) return { ok: false as const, error: error.message };
  }

  // Upsert chapters. The video URL is locked once a chapter exists, so a
  // chapter's video never changes here and AI status stays as-is.
  const chapterRows = input.units.flatMap((u) =>
    u.chapters.map((c, j) => {
      const videoId = c.youtube_url ? extractYoutubeId(c.youtube_url) : null;
      // Persist the canonical watch URL, never the raw pasted one — strips
      // playlist/index params that break Gemini's URL ingestion.
      const cleanUrl = c.youtube_url
        ? canonicalYoutubeUrl(c.youtube_url)
        : null;
      return {
        id: c.id,
        unit_id: u.id,
        title: c.title,
        description: c.description ?? "",
        youtube_url: cleanUrl,
        youtube_video_id: videoId,
        position: j,
      };
    }),
  );
  if (chapterRows.length) {
    const { error } = await supabase.from("chapters").upsert(chapterRows);
    if (error) return { ok: false as const, error: error.message };
  }

  // Delete rows the author removed.
  const keepUnitIds = new Set(input.units.map((u) => u.id));
  const keepChapterIds = new Set(
    input.units.flatMap((u) => u.chapters.map((c) => c.id)),
  );
  const unitsToDelete = existingUnitIds.filter((id) => !keepUnitIds.has(id));
  const chaptersToDelete = (existingChapters ?? [])
    .map((c) => c.id)
    .filter((id) => !keepChapterIds.has(id));

  if (chaptersToDelete.length) {
    await supabase.from("chapters").delete().in("id", chaptersToDelete);
  }
  if (unitsToDelete.length) {
    await supabase.from("units").delete().in("id", unitsToDelete);
  }

  // Adding a new chapter or removing an existing one invalidates a generated
  // final quiz — its coverage no longer matches the course, so mark it stale.
  const existingChapterIds = new Set((existingChapters ?? []).map((c) => c.id));
  const hasNewChapter = input.units.some((u) =>
    u.chapters.some((c) => !existingChapterIds.has(c.id)),
  );
  if (hasNewChapter || chaptersToDelete.length) {
    await supabase
      .from("courses")
      .update({ final_quiz_status: "stale" })
      .eq("id", courseId)
      .eq("final_quiz_status", "ready");
  }

  revalidatePath(`/dashboard/courses/${courseId}/edit`);
  revalidatePath("/dashboard");
  return { ok: true as const, savedAt: new Date().toISOString() };
}

/** Strip answers from a quiz for the learner-facing snapshot. */
function stripQuiz(
  quiz: AuthorAiContent["byChapter"][string]["quiz"] | AuthorAiContent["finalQuiz"],
): PublishedQuiz | null {
  if (!quiz) return null;
  return {
    id: quiz.id,
    reviewed_by_author: quiz.reviewed_by_author,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      position: q.position,
    })),
  };
}

/** Serialize the current draft into a learner-facing snapshot (no quiz answers). */
function serializePublishedTree(
  tree: CourseTree,
  ai: AuthorAiContent,
): PublishedTree {
  return {
    units: tree.units.map((u, i) => ({
      id: u.id,
      title: u.title,
      description: u.description,
      position: i,
      chapters: u.chapters.map((c, j) => {
        const content = ai.byChapter[c.id];
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          youtube_url: c.youtube_url,
          youtube_video_id: c.youtube_video_id,
          position: j,
          summary: content?.summary
            ? {
                content: content.summary.content,
                reviewed_by_author: content.summary.reviewed_by_author,
              }
            : null,
          quiz: stripQuiz(content?.quiz ?? null),
        };
      }),
    })),
    final_quiz: stripQuiz(ai.finalQuiz),
  };
}

/**
 * Publish (or re-publish) a course: freeze the current draft into
 * `published_tree`. Backs both the "Publish" and "Publish changes" buttons.
 */
export async function publishCourse(courseId: string) {
  const user = await requireUser();
  const tree = await getCourseTree(courseId);
  if (!tree) return { ok: false as const, error: "Course not found." };
  if (tree.author_id !== user.id) {
    return { ok: false as const, error: "Not your course." };
  }
  if (!tree.title.trim()) {
    return { ok: false as const, error: "Add a course title first." };
  }
  const chapterCount = tree.units.reduce((n, u) => n + u.chapters.length, 0);
  if (chapterCount === 0) {
    return { ok: false as const, error: "Add at least one chapter first." };
  }

  const ai = await getAuthorAiContent(courseId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({
      status: "published",
      published_tree: serializePublishedTree(tree, ai),
      published_at: new Date().toISOString(),
      has_unpublished_changes: false,
    })
    .eq("id", courseId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/dashboard/courses/${courseId}/edit`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function unpublishCourse(courseId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ status: "draft" })
    .eq("id", courseId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/dashboard/courses/${courseId}/edit`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}
