import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6">
        <section className="flex flex-col items-center py-12 text-center">
          <Badge variant="secondary" className="mb-6 uppercase tracking-wide">
            Turn YouTube into structured courses
          </Badge>
          <h1 className="max-w-3xl font-heading text-5xl leading-tight tracking-tight">
            Learn anything, the smart way — powered by the best videos on
            YouTube
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Build courses from hand-picked YouTube videos. Get AI-generated
            summaries, quizzes, and a tutor you can chat with — for every
            chapter.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/courses" className={buttonVariants({ size: "lg" })}>
              Explore courses
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Create a course →
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Build in Minutes · Free · Create up to 3 courses
          </p>
        </section>
      </main>
    </>
  );
}
