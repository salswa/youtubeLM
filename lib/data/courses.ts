import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CourseTree, CourseCard, UnitWithChapters } from "@/lib/types";

const MAX_COURSES = 3;
export { MAX_COURSES };

/** Supabase infers a to-one relation as an array or object; normalize either. */
function authorName(author: unknown): string | null {
  if (!author) return null;
  const a = Array.isArray(author) ? author[0] : author;
  return (a as { display_name?: string | null } | null)?.display_name ?? null;
}

/** Full course tree (course → ordered units → ordered chapters). RLS-gated. */
export async function getCourseTree(courseId: string): Promise<CourseTree | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(`*, author:profiles(display_name), units(*, chapters(*))`)
    .eq("id", courseId)
    .single();

  if (error || !data) return null;

  const rawUnits = (data.units ?? []) as unknown as UnitWithChapters[];
  const units: UnitWithChapters[] = rawUnits
    .map((u) => ({
      ...u,
      chapters: [...(u.chapters ?? [])].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position);

  return {
    ...data,
    author_name: authorName(data.author),
    units,
  } as CourseTree;
}

function chapterCount(units: unknown): number {
  const arr = (units ?? []) as { chapters?: unknown[] }[];
  return arr.reduce((n, u) => n + (u.chapters?.length ?? 0), 0);
}

/** Published courses for the public grid. */
export async function getPublishedCourses(): Promise<CourseCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `id, title, description, subject, status, cover_url,
       author:profiles(display_name),
       units(id, chapters(id)),
       enrollments(count)`,
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((c): CourseCard => {
    const enr = c.enrollments as unknown as { count: number }[] | null;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      subject: c.subject,
      status: c.status,
      cover_url: c.cover_url,
      author_name: authorName(c.author),
      chapter_count: chapterCount(c.units),
      enrollment_count: enr?.[0]?.count ?? 0,
    };
  });
}

/** Courses authored by the given user (drafts + published). */
export async function getMyCourses(userId: string): Promise<CourseCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `id, title, description, subject, status, cover_url,
       author:profiles(display_name),
       units(id, chapters(id)),
       enrollments(count)`,
    )
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((c): CourseCard => {
    const enr = c.enrollments as unknown as { count: number }[] | null;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      subject: c.subject,
      status: c.status,
      cover_url: c.cover_url,
      author_name: authorName(c.author),
      chapter_count: chapterCount(c.units),
      enrollment_count: enr?.[0]?.count ?? 0,
    };
  });
}

export interface EnrolledCourse extends CourseCard {
  completed_chapters: number;
  progress_pct: number;
}

/** Courses the user is enrolled in, with completion progress. */
export async function getEnrolledCourses(
  userId: string,
): Promise<EnrolledCourse[]> {
  const supabase = await createClient();

  const [{ data: enr }, { data: prog }] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        `course:courses(id, title, description, subject, status, cover_url,
          author:profiles(display_name),
          units(id, chapters(id)))`,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("progress").select("chapter_id").eq("user_id", userId),
  ]);

  const completedSet = new Set((prog ?? []).map((p) => p.chapter_id));

  return (enr ?? [])
    .map((row): EnrolledCourse | null => {
      const c = row.course as unknown as {
        id: string;
        title: string;
        description: string;
        subject: string;
        status: CourseCard["status"];
        cover_url: string | null;
        author: unknown;
        units: { id: string; chapters: { id: string }[] }[];
      } | null;
      if (!c) return null;

      const chapterIds = (c.units ?? []).flatMap((u) =>
        (u.chapters ?? []).map((ch) => ch.id),
      );
      const total = chapterIds.length;
      const completed = chapterIds.filter((id) => completedSet.has(id)).length;

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        subject: c.subject,
        status: c.status,
        cover_url: c.cover_url,
        author_name: authorName(c.author),
        chapter_count: total,
        completed_chapters: completed,
        progress_pct: total ? Math.round((completed / total) * 100) : 0,
      };
    })
    .filter((x): x is EnrolledCourse => x !== null);
}

/** How many courses the user has authored (for the 3-course limit). */
export async function getAuthoredCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("author_id", userId);
  return count ?? 0;
}

/** Chapter ids the user has completed within a course (for the learner view). */
export async function getCompletedChapterIds(
  userId: string,
  chapterIds: string[],
): Promise<Set<string>> {
  if (chapterIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("progress")
    .select("chapter_id")
    .eq("user_id", userId)
    .in("chapter_id", chapterIds);
  return new Set((data ?? []).map((p) => p.chapter_id));
}

/** Whether the user is enrolled in a course. */
export async function isEnrolled(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  return !!data;
}
