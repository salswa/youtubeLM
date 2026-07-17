import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import {
  getPublishedCourse,
  getCompletedChapterIds,
  isEnrolled,
} from "@/lib/data/courses";
import { getUser } from "@/lib/auth";
import { LearnerView } from "@/components/learn/learner-view";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await getPublishedCourse(id);
  if (!course) notFound();

  const user = await getUser();
  const chapterIds = course.units.flatMap((u) =>
    u.chapters.map((c) => c.id),
  );

  const [completed, enrolled] = user
    ? await Promise.all([
        getCompletedChapterIds(user.id, chapterIds),
        isEnrolled(user.id, course.id),
      ])
    : [new Set<string>(), false];

  return (
    <>
      <SiteNav />
      <LearnerView
        course={course}
        completedIds={[...completed]}
        enrolled={enrolled}
        isAuthed={!!user}
      />
    </>
  );
}
