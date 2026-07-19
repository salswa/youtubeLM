"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  transcribeYouTube,
  summarizeTranscript,
  generateChapterQuiz as aiGenerateQuiz,
  generateFinalQuiz,
} from "@/lib/ai/gemini";
import type { AiStatus, ChapterAiContent } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;
const PENDING: AiStatus[] = ["idle", "stale", "error"];

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

/** Transcribe once and cache; both summary and quiz reuse the stored text. */
async function ensureTranscript(
  admin: Admin,
  chapter: { id: string; youtube_url: string },
): Promise<string> {
  const { data } = await admin
    .from("transcripts")
    .select("content")
    .eq("chapter_id", chapter.id)
    .maybeSingle();
  if (data?.content) return data.content;

  const transcript = await transcribeYouTube(chapter.youtube_url);
  await admin
    .from("transcripts")
    .upsert(
      { chapter_id: chapter.id, content: transcript, language: "en" },
      { onConflict: "chapter_id" },
    );
  return transcript;
}

async function loadChapter(admin: Admin, chapterId: string) {
  const { data } = await admin
    .from("chapters")
    .select("id, youtube_url, youtube_video_id")
    .eq("id", chapterId)
    .single();
  return data;
}

// ── summary pipeline ─────────────────────────────────────────────────────────
async function runSummary(admin: Admin, chapterId: string): Promise<AiStatus> {
  const chapter = await loadChapter(admin, chapterId);
  if (!chapter?.youtube_video_id || !chapter.youtube_url) {
    await admin
      .from("chapters")
      .update({ summary_status: "error", ai_error: "No video on this chapter." })
      .eq("id", chapterId);
    return "error";
  }
  const courseId = await courseIdForChapter(admin, chapterId);
  await admin
    .from("chapters")
    .update({ summary_status: "processing", ai_error: null })
    .eq("id", chapterId);

  try {
    const transcript = await ensureTranscript(admin, {
      id: chapterId,
      youtube_url: chapter.youtube_url,
    });
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
    await admin
      .from("chapters")
      .update({ summary_status: "ready" })
      .eq("id", chapterId);
    if (courseId) {
      await markDirtyIfPublished(admin, courseId);
    }
    return "ready";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Summary failed";
    console.error(`[ai] summary ${chapterId} failed:`, e);
    await admin
      .from("chapters")
      .update({ summary_status: "error", ai_error: message.slice(0, 500) })
      .eq("id", chapterId);
    return "error";
  }
}

// ── quiz pipeline ────────────────────────────────────────────────────────────
async function runQuiz(admin: Admin, chapterId: string): Promise<AiStatus> {
  const chapter = await loadChapter(admin, chapterId);
  if (!chapter?.youtube_video_id || !chapter.youtube_url) {
    await admin
      .from("chapters")
      .update({ quiz_status: "error", ai_error: "No video on this chapter." })
      .eq("id", chapterId);
    return "error";
  }
  const courseId = await courseIdForChapter(admin, chapterId);
  await admin
    .from("chapters")
    .update({ quiz_status: "processing", ai_error: null })
    .eq("id", chapterId);

  try {
    const transcript = await ensureTranscript(admin, {
      id: chapterId,
      youtube_url: chapter.youtube_url,
    });
    const questions = await aiGenerateQuiz(transcript, 5);
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
      .update({ quiz_status: "ready" })
      .eq("id", chapterId);
    if (courseId) await markDirtyIfPublished(admin, courseId);
    return "ready";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Quiz failed";
    console.error(`[ai] quiz ${chapterId} failed:`, e);
    await admin
      .from("chapters")
      .update({ quiz_status: "error", ai_error: message.slice(0, 500) })
      .eq("id", chapterId);
    return "error";
  }
}

// ── public per-chapter actions ───────────────────────────────────────────────
export async function generateChapterSummary(chapterId: string, force = false) {
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
    if (data?.reviewed_by_author)
      return { ok: true as const, status: "ready" as AiStatus };
  }
  return { ok: true as const, status: await runSummary(admin, chapterId) };
}

export async function generateChapterQuiz(chapterId: string, force = false) {
  await requireUser();
  if (!(await isChapterAuthor(chapterId))) {
    return { ok: false as const, error: "Not allowed." };
  }
  const admin = createAdminClient();
  if (!force) {
    const { data } = await admin
      .from("quizzes")
      .select("reviewed_by_author")
      .eq("chapter_id", chapterId)
      .eq("scope", "chapter")
      .maybeSingle();
    if (data?.reviewed_by_author)
      return { ok: true as const, status: "ready" as AiStatus };
  }
  return { ok: true as const, status: await runQuiz(admin, chapterId) };
}

export async function regenerateSummary(chapterId: string) {
  return generateChapterSummary(chapterId, true);
}
export async function regenerateQuiz(chapterId: string) {
  return generateChapterQuiz(chapterId, true);
}

/** Per-chapter list of what still needs generation, for the bulk Generate AI run. */
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
    .select(
      "id, youtube_video_id, summary_status, quiz_status, summaries(reviewed_by_author), quizzes(reviewed_by_author, scope)",
    )
    .in("unit_id", unitIds);

  return (chapters ?? [])
    .map((c) => {
      const summaryReviewed =
        (c.summaries as { reviewed_by_author: boolean }[] | null)?.[0]
          ?.reviewed_by_author ?? false;
      const chapterQuiz = (
        c.quizzes as { reviewed_by_author: boolean; scope: string }[] | null
      )?.find((q) => q.scope === "chapter");
      const hasVideo = !!c.youtube_video_id;
      const needSummary =
        hasVideo &&
        PENDING.includes(c.summary_status as AiStatus) &&
        !summaryReviewed;
      const needQuiz =
        hasVideo &&
        PENDING.includes(c.quiz_status as AiStatus) &&
        !chapterQuiz?.reviewed_by_author;
      return { id: c.id as string, needSummary, needQuiz };
    })
    .filter((c) => c.needSummary || c.needQuiz);
}

/**
 * (Re)build the final course quiz from all chapter summaries. Runs only on
 * demand — never automatically on chapter changes. Skips regeneration of an
 * author-reviewed quiz unless `force` is set.
 */
export async function generateFinalCourseQuiz(courseId: string, force = false) {
  if (!(await isCourseAuthor(courseId))) {
    return { ok: false as const, error: "Not allowed." };
  }
  const admin = createAdminClient();

  if (!force) {
    const { data: existing } = await admin
      .from("quizzes")
      .select("reviewed_by_author")
      .eq("course_id", courseId)
      .eq("scope", "course")
      .maybeSingle();
    if (existing?.reviewed_by_author) {
      return { ok: true as const, status: "ready" as AiStatus };
    }
  }

  const { data: units } = await admin
    .from("units")
    .select("id")
    .eq("course_id", courseId);
  const unitIds = (units ?? []).map((u) => u.id);

  const { data: chapters } = unitIds.length
    ? await admin.from("chapters").select("id").in("unit_id", unitIds)
    : { data: [] as { id: string }[] };
  const chapterIds = (chapters ?? []).map((c) => c.id);

  const { data: summaries } = chapterIds.length
    ? await admin.from("summaries").select("content").in("chapter_id", chapterIds)
    : { data: [] as { content: string }[] };
  const texts = (summaries ?? []).map((s) => s.content);

  if (texts.length < 1) {
    await admin
      .from("courses")
      .update({ final_quiz_status: "idle" })
      .eq("id", courseId);
    return {
      ok: false as const,
      error: "Generate chapter summaries first.",
      status: "idle" as AiStatus,
    };
  }

  await admin
    .from("courses")
    .update({ final_quiz_status: "processing" })
    .eq("id", courseId);

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
    await admin
      .from("courses")
      .update({ final_quiz_status: "ready" })
      .eq("id", courseId);
    await markDirtyIfPublished(admin, courseId);
    revalidatePath(`/dashboard/courses/${courseId}/edit`);
    return { ok: true as const, status: "ready" as AiStatus };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Final quiz failed";
    await admin
      .from("courses")
      .update({ final_quiz_status: "error" })
      .eq("id", courseId);
    return { ok: false as const, error: message, status: "error" as AiStatus };
  }
}

/** Load the final course quiz + its status for the author's dialog. */
export async function getFinalQuizContent(courseId: string): Promise<{
  status: AiStatus;
  quiz: {
    id: string;
    reviewed_by_author: boolean;
    questions: NonNullable<ChapterAiContent["quiz"]>["questions"];
  } | null;
} | null> {
  if (!(await isCourseAuthor(courseId))) return null;
  const supabase = await createClient();

  const [{ data: course }, { data: quiz }] = await Promise.all([
    supabase
      .from("courses")
      .select("final_quiz_status")
      .eq("id", courseId)
      .single(),
    supabase
      .from("quizzes")
      .select(
        "id, reviewed_by_author, quiz_questions(id, question, options, correct_index, explanation, position)",
      )
      .eq("course_id", courseId)
      .eq("scope", "course")
      .maybeSingle(),
  ]);

  return {
    status: (course?.final_quiz_status as AiStatus) ?? "idle",
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
  await admin
    .from("chapters")
    .update({ summary_status: "ready" })
    .eq("id", chapterId);

  const courseId = await courseIdForChapter(admin, chapterId);
  if (courseId) {
    await markDirtyIfPublished(admin, courseId);
  }
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

  const { data: quiz } = await admin
    .from("quizzes")
    .update({ reviewed_by_author: true })
    .eq("id", readable.quiz_id)
    .select("scope, chapter_id, course_id")
    .single();
  if (quiz?.scope === "chapter" && quiz.chapter_id) {
    await admin
      .from("chapters")
      .update({ quiz_status: "ready" })
      .eq("id", quiz.chapter_id);
  } else if (quiz?.scope === "course" && quiz.course_id) {
    await admin
      .from("courses")
      .update({ final_quiz_status: "ready" })
      .eq("id", quiz.course_id);
  }
  return { ok: true as const };
}

/** Load a chapter's draft AI content for the author's review/edit dialogs. */
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
