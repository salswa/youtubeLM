import Link from "next/link";
import type { CourseCard as CourseCardType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function initials(title: string) {
  return title.trim().charAt(0).toUpperCase() || "?";
}

export function CourseCard({
  course,
  href,
}: {
  course: CourseCardType;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full gap-0 overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="grid aspect-video place-items-center bg-gradient-to-br from-primary/15 to-primary/5 font-heading text-4xl text-primary">
          {course.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.cover_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials(course.title)
          )}
        </div>
        <div className="space-y-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {course.subject && (
              <Badge variant="secondary">{course.subject}</Badge>
            )}
            <Badge variant="outline">{course.chapter_count} chapters</Badge>
          </div>
          <h3 className="line-clamp-2 font-heading text-lg leading-tight">
            {course.title}
          </h3>
          {course.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {course.description}
            </p>
          )}
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span>{course.author_name ?? "Anonymous"}</span>
            {course.enrollment_count !== undefined && (
              <span>{course.enrollment_count} learners</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
