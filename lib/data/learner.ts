import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCourseTree } from "@/lib/data/courses";
import { getAuthorAiContent } from "@/lib/data/ai";
import type { LearnerCourse, PublishedTree, PublishedQuiz } from "@/lib/types";

function authorName(author: unknown): string | null {
  if (!author) return null;
  const a = Array.isArray(author) ? author[0] : author;
  return (a as { display_name?: string | null } | null)?.display_name ?? null;
}

/** Learner-facing course from the frozen published snapshot. */
export async function getLearnerCourse(
  courseId: string,
): Promise<LearnerCourse | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(`id, title, published_tree, author:profiles(display_name)`)
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();

  if (!data || !data.published_tree) return null;
  const tree = data.published_tree as PublishedTree;

  return {
    id: data.id,
    title: data.title,
    author_name: authorName(data.author),
    units: tree.units.map((u) => ({
      id: u.id,
      title: u.title,
      chapters: u.chapters.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        youtube_video_id: c.youtube_video_id,
        summary: c.summary,
        quiz: c.quiz,
      })),
    })),
    final_quiz: tree.final_quiz,
  };
}

/** Author preview: the live draft rendered like the learner view (answers stripped). */
export async function getDraftLearnerCourse(
  courseId: string,
): Promise<LearnerCourse | null> {
  const tree = await getCourseTree(courseId);
  if (!tree) return null;
  const ai = await getAuthorAiContent(courseId);

  const strip = (
    quiz: (typeof ai)["finalQuiz"],
  ): PublishedQuiz | null =>
    quiz
      ? {
          id: quiz.id,
          reviewed_by_author: quiz.reviewed_by_author,
          questions: quiz.questions.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            position: q.position,
          })),
        }
      : null;

  return {
    id: tree.id,
    title: tree.title,
    author_name: tree.author_name,
    units: tree.units.map((u) => ({
      id: u.id,
      title: u.title,
      chapters: u.chapters.map((c) => {
        const content = ai.byChapter[c.id];
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          youtube_video_id: c.youtube_video_id,
          summary: content?.summary
            ? {
                content: content.summary.content,
                reviewed_by_author: content.summary.reviewed_by_author,
              }
            : null,
          quiz: strip(content?.quiz ?? null),
        };
      }),
    })),
    final_quiz: strip(ai.finalQuiz),
  };
}
