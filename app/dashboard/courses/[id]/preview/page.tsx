import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCourseTree, getCompletedChapterIds } from "@/lib/data/courses";
import { LearnerView } from "@/components/learn/learner-view";

export const dynamic = "force-dynamic";

export default async function CoursePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const course = await getCourseTree(id);
  if (!course) notFound();
  if (course.author_id !== user.id) redirect("/dashboard");

  const chapterIds = course.units.flatMap((u) =>
    u.chapters.map((c) => c.id),
  );
  const completed = await getCompletedChapterIds(user.id, chapterIds);

  return (
    <LearnerView
      course={course}
      completedIds={[...completed]}
      enrolled={false}
      isAuthed
      preview
    />
  );
}
