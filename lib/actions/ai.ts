"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  transcribeYouTube,
  summarizeTranscript,
  generateChapterQuiz,
  generateFinalQuiz,
} from "@/lib/ai/gemini";
import type { AiStatus, ChapterAiContent } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

// ── authorization helpers (RLS author-only SELECT proves ownership) ──────────
async function isChapterAuthor(chapterId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chapters")
    .select("id")
    .eq("id", chapterId)
    .maybeSingle();
  return !!data;
}

async function isCourseAuthor(courseId: string): Promise<boolean> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("author_id", user.id)
    .maybeSingle();
  return !!data;
}

async function courseIdForChapter(
  admin: Admin,
  chapterId: string,
): Promise<string | null> {
  const { data: ch } = await admin
    .from("chapters")
    .select("unit_id")
    .eq("id", chapterId)
    .single();
  if (!ch) return null;
  const { data: unit } = await admin
    .from("units")
    .select("course_id")
    .eq("id", ch.unit_id)
    .single();
  return unit?.course_id ?? null;
}

async function markDirtyIfPublished(admin: Admin, courseId: string) {
  const { data } = await admin
    .from("courses")
    .select("status")
    .eq("id", courseId)
    .single();
  if (data?.status === "published") {
    await admin
      .from("courses")
      .update({ has_unpublished_changes: true })
      .eq("id", courseId);
  }
}

// ── chapter generation ───────────────────────────────────────────────────────
/** Chapters that still need AI (idle/stale/error, have a video, not author-reviewed). */
export async function getPendingAiChapters(courseId: string) {
  if (!(await isCourseAuthor(courseId))) return [];
  const admin = createAdminClient();

  const { data: units } = await admin
    .from("units")
    .select("id")
    .eq("course_id", courseId);
  const unitIds = (units ?? []).map((u) => u.id);
  if (!unitIds.length) return [];

  const { data: chapters } = await admin
    .from("chapters")
    .select("id, youtube_video_id, ai_status, summaries(reviewed_by_author)")
    .in("unit_id", unitIds);

  return (chapters ?? [])
    .filter((c) => {
      const reviewed =
        (c.summaries as { reviewed_by_author: boolean }[] | null)?.[0]
          ?.reviewed_by_author ?? false;
      return (
        !!c.youtube_video_id &&
        ["idle", "stale", "error"].includes(c.ai_status) &&
        !reviewed
      );
    })
    .map((c) => c.id as string);
}

async function runChapterPipeline(
  admin: Admin,
  chapterId: string,
): Promise<AiStatus> {
  const { data: chapter } = await admin
    .from("chapters")
    .select("id, unit_id, youtube_url, youtube_video_id")
    .eq("id", chapterId)
    .single();

  if (!chapter?.youtube_video_id || !chapter.youtube_url) {
    await admin
      .from("chapters")
      .update({ ai_status: "error", ai_error: "No video on this chapter." })
      .eq("id", chapterId);
    return "error";
  }

  const courseId = await courseIdForChapter(admin, chapterId);
  await admin
    .from("chapters")
    .update({ ai_status: "processing", ai_error: null })
    .eq("id", chapterId);

  try {
    const transcript = await transcribeYouTube(chapter.youtube_url);
    await admin
      .from("transcripts")
      .upsert(
        { chapter_id: chapterId, content: transcript, language: "en" },
        { onConflict: "chapter_id" },
      );

    const summary = await summarizeTranscript(transcript);
    await admin.from("summaries").upsert(
      {
        chapter_id: chapterId,
        content: summary,
        reviewed_by_author: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "chapter_id" },
    );

    const questions = await generateChapterQuiz(transcript, 5);
    await admin
      .from("quizzes")
      .delete()
      .eq("chapter_id", chapterId)
      .eq("scope", "chapter");
    const { data: quiz } = await admin
      .from("quizzes")
      .insert({
        scope: "chapter",
        course_id: courseId,
        chapter_id: chapterId,
        reviewed_by_author: false,
      })
      .select("id")
      .single();
    if (quiz) {
      await admin.from("quiz_questions").insert(
        questions.map((q, i) => ({
          quiz_id: quiz.id,
          question: q.question,
          options: q.options,
          correct_index: q.correctIndex,
          explanation: q.explanation,
          position: i,
        })),
      );
    }

    await admin
      .from("chapters")
      .update({ ai_status: "ready", ai_error: null })
      .eq("id", chapterId);
    if (courseId) await markDirtyIfPublished(admin, courseId);
    return "ready";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    // Surface in server logs (Vercel functions) — the DB only keeps the last error.
    console.error(`[ai] chapter ${chapterId} pipeline failed:`, e);
    await admin
      .from("chapters")
      .update({ ai_status: "error", ai_error: message.slice(0, 500) })
      .eq("id", chapterId);
    return "error";
  }
}

/** Generate AI content for a single chapter (skips author-reviewed unless forced). */
export async function generateChapterAI(chapterId: string, force = false) {
  await requireUser();
  if (!(await isChapterAuthor(chapterId))) {
    return { ok: false as const, error: "Not allowed." };
  }
  const admin = createAdminClient();

  if (!force) {
    const { data } = await admin
      .from("summaries")
      .select("reviewed_by_author")
      .eq("chapter_id", chapterId)
      .maybeSingle();
    if (data?.reviewed_by_author) {
      return { ok: true as const, status: "ready" as AiStatus };
    }
  }

  const status = await runChapterPipeline(admin, chapterId);
  return { ok: true as const, status };
}

export async function regenerateChapterAI(chapterId: string) {
  return generateChapterAI(chapterId, true);
}

/** Load a chapter's draft AI content for the author's review/edit dialog. */
export async function getChapterAiContent(
  chapterId: string,
): Promise<ChapterAiContent | null> {
  await requireUser();
  if (!(await isChapterAuthor(chapterId))) return null;
  const supabase = await createClient();

  const [{ data: summary }, { data: quiz }] = await Promise.all([
    supabase
      .from("summaries")
      .select("content, reviewed_by_author")
      .eq("chapter_id", chapterId)
      .maybeSingle(),
    supabase
      .from("quizzes")
      .select(
        "id, reviewed_by_author, quiz_questions(id, question, options, correct_index, explanation, position)",
      )
      .eq("chapter_id", chapterId)
      .eq("scope", "chapter")
      .maybeSingle(),
  ]);

  return {
    chapterId,
    summary: summary
      ? { content: summary.content, reviewed_by_author: summary.reviewed_by_author }
      : null,
    quiz: quiz
      ? {
          id: quiz.id,
          reviewed_by_author: quiz.reviewed_by_author,
          questions: (
            (quiz.quiz_questions ?? []) as NonNullable<
              ChapterAiContent["quiz"]
            >["questions"]
          )
            .slice()
            .sort((a, b) => a.position - b.position),
        }
      : null,
  };
}

/** (Re)build the final course quiz from all chapter summaries. */
export async function generateFinalCourseQuiz(courseId: string) {
  if (!(await isCourseAuthor(courseId))) {
    return { ok: false as const, error: "Not allowed." };
  }
  const admin = createAdminClient();

  const { data: units } = await admin
    .from("units")
    .select("id")
    .eq("course_id", courseId);
  const unitIds = (units ?? []).map((u) => u.id);
  if (!unitIds.length) return { ok: true as const };

  const { data: chapters } = await admin
    .from("chapters")
    .select("id")
    .in("unit_id", unitIds);
  const chapterIds = (chapters ?? []).map((c) => c.id);
  if (!chapterIds.length) return { ok: true as const };

  const { data: summaries } = await admin
    .from("summaries")
    .select("content")
    .in("chapter_id", chapterIds);
  const texts = (summaries ?? []).map((s) => s.content);
  if (texts.length < 1) return { ok: true as const };

  try {
    const questions = await generateFinalQuiz(texts, 8);
    await admin
      .from("quizzes")
      .delete()
      .eq("course_id", courseId)
      .eq("scope", "course");
    const { data: quiz } = await admin
      .from("quizzes")
      .insert({ scope: "course", course_id: courseId, reviewed_by_author: false })
      .select("id")
      .single();
    if (quiz) {
      await admin.from("quiz_questions").insert(
        questions.map((q, i) => ({
          quiz_id: quiz.id,
          question: q.question,
          options: q.options,
          correct_index: q.correctIndex,
          explanation: q.explanation,
          position: i,
        })),
      );
    }
    await markDirtyIfPublished(admin, courseId);
    revalidatePath(`/dashboard/courses/${courseId}/edit`);
    return { ok: true as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Final quiz failed";
    console.error(`[ai] final quiz for course ${courseId} failed:`, e);
    return { ok: false as const, error: message };
  }
}

// ── author edits (mark reviewed) ─────────────────────────────────────────────
export async function updateSummary(chapterId: string, content: string) {
  await requireUser();
  if (!(await isChapterAuthor(chapterId))) {
    return { ok: false as const, error: "Not allowed." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("summaries").upsert(
    {
      chapter_id: chapterId,
      content,
      reviewed_by_author: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "chapter_id" },
  );
  if (error) return { ok: false as const, error: error.message };

  const courseId = await courseIdForChapter(admin, chapterId);
  if (courseId) await markDirtyIfPublished(admin, courseId);
  return { ok: true as const };
}

export async function updateQuizQuestion(
  questionId: string,
  input: {
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
  },
) {
  await requireUser();
  const supabase = await createClient();
  const { data: readable } = await supabase
    .from("quiz_questions")
    .select("id, quiz_id")
    .eq("id", questionId)
    .maybeSingle();
  if (!readable) return { ok: false as const, error: "Not allowed." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("quiz_questions")
    .update({
      question: input.question,
      options: input.options,
      correct_index: input.correct_index,
      explanation: input.explanation,
    })
    .eq("id", questionId);
  if (error) return { ok: false as const, error: error.message };

  await admin
    .from("quizzes")
    .update({ reviewed_by_author: true })
    .eq("id", readable.quiz_id);
  return { ok: true as const };
}

// ── learner: submit a quiz, grade server-side ────────────────────────────────
export async function submitQuiz(quizId: string, answers: number[]) {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: questions } = await admin
    .from("quiz_questions")
    .select("id, correct_index, explanation, position")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });

  if (!questions || questions.length === 0) {
    return { ok: false as const, error: "Quiz not found." };
  }

  const results = questions.map((q, i) => ({
    questionId: q.id as string,
    correctIndex: q.correct_index as number,
    explanation: q.explanation as string,
    chosenIndex: answers[i] ?? -1,
    correct: (answers[i] ?? -1) === q.correct_index,
  }));
  const score = results.filter((r) => r.correct).length;
  const total = questions.length;

  const supabase = await createClient();
  await supabase.from("quiz_attempts").insert({
    user_id: user.id,
    quiz_id: quizId,
    score: Math.round((score / total) * 100),
    answers,
  });

  return { ok: true as const, score, total, results };
}
