import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { requireUser } from "@/lib/auth";
import {
  getMyCourses,
  getEnrolledCourses,
  MAX_COURSES,
} from "@/lib/data/courses";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CreateCourseButton } from "@/components/dashboard/create-course-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const [myCourses, enrolled] = await Promise.all([
    getMyCourses(user.id),
    getEnrolledCourses(user.id),
  ]);

  const createdCount = myCourses.length;
  const atLimit = createdCount >= MAX_COURSES;
  const chaptersDone = enrolled.reduce((n, c) => n + c.completed_chapters, 0);

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl tracking-tight">
              Welcome back, {displayName} 👋
            </h1>
            <p className="mt-1 text-muted-foreground">
              Pick up where you left off, or build something new.
            </p>
          </div>
          <CreateCourseButton disabled={atLimit} />
        </div>

        {/* stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Enrolled" value={enrolled.length} />
          <StatCard label="Chapters done" value={chaptersDone} />
          <StatCard
            label="Courses created"
            value={`${createdCount} / ${MAX_COURSES}`}
          />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Continue learning */}
          <section>
            <h2 className="font-heading text-xl">Continue learning</h2>
            {enrolled.length === 0 ? (
              <Card className="mt-4">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  You haven&apos;t enrolled in any courses yet.{" "}
                  <Link href="/courses" className="text-primary underline">
                    Browse courses
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="mt-4">
                <CardContent className="divide-y p-0">
                  {enrolled.map((c) => (
                    <Link
                      key={c.id}
                      href={`/courses/${c.id}`}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="grid size-12 shrink-0 place-items-center rounded-none bg-primary/10 font-heading text-lg text-primary">
                        {c.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.title}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <Progress value={c.progress_pct} className="h-1.5" />
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {c.completed_chapters}/{c.chapter_count}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>

          {/* Your courses */}
          <section>
            <h2 className="font-heading text-xl">Your courses</h2>
            <Card className="mt-4">
              <CardContent className="space-y-4 p-5">
                {myCourses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    You haven&apos;t created any courses yet.
                  </p>
                )}
                {myCourses.map((c, i) => (
                  <div key={c.id}>
                    {i > 0 && <Separator className="mb-4" />}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.chapter_count} chapters ·{" "}
                          {c.enrollment_count ?? 0} learners
                        </p>
                      </div>
                      <Badge
                        variant={
                          c.status === "published" ? "default" : "secondary"
                        }
                      >
                        {c.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/dashboard/courses/${c.id}/edit`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Edit
                      </Link>
                      {c.status === "published" && (
                        <Link
                          href={`/courses/${c.id}`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                          })}
                        >
                          Preview
                        </Link>
                      )}
                    </div>
                  </div>
                ))}

                <Separator />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    {atLimit
                      ? "You've reached the 3-course limit."
                      : `${MAX_COURSES - createdCount} course slot${
                          MAX_COURSES - createdCount === 1 ? "" : "s"
                        } remaining`}
                  </p>
                  <CreateCourseButton
                    disabled={atLimit}
                    className="mt-2 w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}
