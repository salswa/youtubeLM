import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCourseTree, getCompletedChapterIds } from "@/lib/data/courses";
import { getDraftLearnerCourse } from "@/lib/data/learner";
import { LearnerView } from "@/components/learn/learner-view";

export const dynamic = "force-dynamic";

export default async function CoursePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const tree = await getCourseTree(id);
  if (!tree) notFound();
  if (tree.author_id !== user.id) redirect("/dashboard");

  const course = await getDraftLearnerCourse(id);
  if (!course) notFound();

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
