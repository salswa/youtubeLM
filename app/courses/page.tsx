import { SiteNav } from "@/components/site-nav";
import { CourseCard } from "@/components/course-card";
import { getPublishedCourses } from "@/lib/data/courses";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await getPublishedCourses();

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-heading text-3xl tracking-tight">Browse courses</h1>
        <p className="mt-1 text-muted-foreground">
          Public courses built by the community — enroll and start learning.
        </p>

        {courses.length === 0 ? (
          <div className="mt-16 rounded-none border border-dashed p-12 text-center text-muted-foreground">
            No published courses yet. Be the first to create one!
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} href={`/courses/${c.id}`} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
