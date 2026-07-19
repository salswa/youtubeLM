import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChapterAiContent } from "@/lib/types";

interface DbQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  position: number;
}

export interface AuthorAiContent {
  byChapter: Record<string, ChapterAiContent>;
  finalQuiz: {
    id: string;
    reviewed_by_author: boolean;
    questions: DbQuizQuestion[];
  } | null;
}

/** All draft AI content for a course, readable by its author (RLS). */
export async function getAuthorAiContent(
  courseId: string,
): Promise<AuthorAiContent> {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from("units")
    .select("id")
    .eq("course_id", courseId);
  const unitIds = (units ?? []).map((u) => u.id);

  const byChapter: Record<string, ChapterAiContent> = {};
  if (unitIds.length) {
    const { data: chapters } = await supabase
      .from("chapters")
      .select("id")
      .in("unit_id", unitIds);
    const chapterIds = (chapters ?? []).map((c) => c.id);

    if (chapterIds.length) {
      const [{ data: summaries }, { data: quizzes }] = await Promise.all([
        supabase
          .from("summaries")
          .select("chapter_id, content, reviewed_by_author")
          .in("chapter_id", chapterIds),
        supabase
          .from("quizzes")
          .select(
            "id, chapter_id, reviewed_by_author, quiz_questions(id, question, options, correct_index, explanation, position)",
          )
          .eq("scope", "chapter")
          .in("chapter_id", chapterIds),
      ]);

      for (const id of chapterIds) {
        byChapter[id] = { chapterId: id, summary: null, quiz: null };
      }
      for (const s of summaries ?? []) {
        byChapter[s.chapter_id] = {
          chapterId: s.chapter_id,
          summary: {
            content: s.content,
            reviewed_by_author: s.reviewed_by_author,
          },
          quiz: byChapter[s.chapter_id]?.quiz ?? null,
        };
      }
      for (const q of quizzes ?? []) {
        if (!q.chapter_id) continue;
        const questions = ((q.quiz_questions as DbQuizQuestion[]) ?? []).sort(
          (a, b) => a.position - b.position,
        );
        byChapter[q.chapter_id] = {
          chapterId: q.chapter_id,
          summary: byChapter[q.chapter_id]?.summary ?? null,
          quiz: {
            id: q.id,
            reviewed_by_author: q.reviewed_by_author,
            questions,
          },
        };
      }
    }
  }

  const { data: finalRows } = await supabase
    .from("quizzes")
    .select(
      "id, reviewed_by_author, quiz_questions(id, question, options, correct_index, explanation, position)",
    )
    .eq("course_id", courseId)
    .eq("scope", "course")
    .maybeSingle();

  const finalQuiz = finalRows
    ? {
        id: finalRows.id,
        reviewed_by_author: finalRows.reviewed_by_author,
        questions: ((finalRows.quiz_questions as DbQuizQuestion[]) ?? []).sort(
          (a, b) => a.position - b.position,
        ),
      }
    : null;

  return { byChapter, finalQuiz };
}
