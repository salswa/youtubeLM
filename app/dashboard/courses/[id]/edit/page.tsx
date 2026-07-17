import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCourseTree } from "@/lib/data/courses";
import { CourseBuilder } from "@/components/builder/course-builder";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const course = await getCourseTree(id);
  if (!course) notFound();
  if (course.author_id !== user.id) redirect("/dashboard");

  return <CourseBuilder course={course} />;
}
