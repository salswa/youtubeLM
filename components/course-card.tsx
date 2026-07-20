import Link from "next/link";
import {
  Sigma,
  Atom,
  Braces,
  FlaskConical,
  Leaf,
  Landmark,
  Languages,
  Music,
  Palette,
  Briefcase,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import type { CourseCard as CourseCardType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Theme = { bg: string; fg: string };

// Subject-themed thumbnails: a light pastel gradient in light mode, a deep tint
// in dark mode, with a matching accent for the icon + label.
const THEMES: Theme[] = [
  {
    bg: "from-indigo-100 to-violet-100 dark:from-indigo-950/70 dark:to-violet-950/70",
    fg: "text-indigo-700 dark:text-indigo-300",
  },
  {
    bg: "from-emerald-100 to-green-100 dark:from-emerald-950/70 dark:to-green-950/70",
    fg: "text-emerald-700 dark:text-emerald-300",
  },
  {
    bg: "from-amber-100 to-yellow-100 dark:from-amber-950/70 dark:to-yellow-950/70",
    fg: "text-amber-700 dark:text-amber-300",
  },
  {
    bg: "from-sky-100 to-blue-100 dark:from-sky-950/70 dark:to-blue-950/70",
    fg: "text-sky-700 dark:text-sky-300",
  },
  {
    bg: "from-rose-100 to-pink-100 dark:from-rose-950/70 dark:to-pink-950/70",
    fg: "text-rose-700 dark:text-rose-300",
  },
  {
    bg: "from-fuchsia-100 to-purple-100 dark:from-fuchsia-950/70 dark:to-purple-950/70",
    fg: "text-fuchsia-700 dark:text-fuchsia-300",
  },
];

const ICONS: LucideIcon[] = [
  Sigma,
  Atom,
  Braces,
  FlaskConical,
  Leaf,
  Landmark,
  Languages,
  Music,
  Palette,
  Briefcase,
  GraduationCap,
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Assign a color and icon at "random" — but seeded from the course id so each
// course keeps the same look across renders (and between server and client).
// Color and icon are seeded separately so they vary independently.
function courseVisual(course: CourseCardType): { Icon: LucideIcon; theme: Theme } {
  const seed = course.id || course.title;
  return {
    theme: THEMES[hash(seed) % THEMES.length],
    Icon: ICONS[hash(`icon:${seed}`) % ICONS.length],
  };
}

export function CourseCard({
  course,
  href,
}: {
  course: CourseCardType;
  href: string;
}) {
  const { Icon, theme } = courseVisual(course);
  const label = course.subject?.trim() || "Course";

  return (
    <Link
      href={href}
      className="group rounded-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full gap-0 overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <div
          className={`grid aspect-video place-items-center bg-linear-to-br ${theme.bg}`}
        >
          {course.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.cover_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className={`flex items-center gap-2 font-heading text-2xl font-semibold ${theme.fg}`}
            >
              <Icon className="size-6" strokeWidth={2.25} />
              {label}
            </span>
          )}
        </div>
        <div className="space-y-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
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
