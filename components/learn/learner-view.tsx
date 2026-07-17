"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Play, CircleCheck, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { YouTubeEmbed } from "@/components/player/youtube-embed";
import { enrollInCourse, setChapterComplete } from "@/lib/actions/enrollment";
import type { CourseTree, Chapter } from "@/lib/types";

export function LearnerView({
  course,
  completedIds,
  enrolled,
  isAuthed,
  preview = false,
}: {
  course: CourseTree;
  completedIds: string[];
  enrolled: boolean;
  isAuthed: boolean;
  preview?: boolean;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(
    new Set(completedIds),
  );
  const [pending, startTransition] = useTransition();

  // flat chapter list for prev/next + first-chapter default
  const flat = useMemo(
    () => course.units.flatMap((u) => u.chapters),
    [course.units],
  );
  const [activeId, setActiveId] = useState<string | null>(flat[0]?.id ?? null);

  const active: Chapter | null =
    flat.find((c) => c.id === activeId) ?? flat[0] ?? null;
  const activeIndex = flat.findIndex((c) => c.id === active?.id);

  const total = flat.length;
  const doneCount = flat.filter((c) => completed.has(c.id)).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  function handleEnroll() {
    startTransition(async () => {
      const res = await enrollInCourse(course.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Enrolled!");
      router.refresh();
    });
  }

  function toggleComplete() {
    if (!active) return;
    if (!enrolled) {
      toast.info("Enroll in this course to track your progress.");
      return;
    }
    const isDone = completed.has(active.id);
    const next = new Set(completed);
    if (isDone) next.delete(active.id);
    else next.add(active.id);
    setCompleted(next);
    startTransition(async () => {
      const res = await setChapterComplete(active.id, !isDone, course.id);
      if (!res.ok) {
        toast.error(res.error);
        setCompleted(completed); // revert
      }
    });
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[300px_1fr]">
      {/* sidebar */}
      <aside className="hidden overflow-y-auto border-r bg-card p-4 lg:block">
        <Link
          href="/courses"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← All courses
        </Link>
        <h2 className="mt-2 font-heading text-lg leading-tight">
          {course.title}
        </h2>
        <div className="mt-3 flex items-center gap-2">
          <Progress value={pct} className="h-1.5" />
          <span className="shrink-0 text-xs text-muted-foreground">
            {doneCount}/{total}
          </span>
        </div>

        <nav className="mt-4 space-y-4">
          {course.units.map((unit, ui) => (
            <div key={unit.id}>
              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Unit {ui + 1} · {unit.title}
              </p>
              <ul>
                {unit.chapters.map((ch) => {
                  const done = completed.has(ch.id);
                  const isActive = ch.id === active?.id;
                  return (
                    <li key={ch.id}>
                      <button
                        onClick={() => setActiveId(ch.id)}
                        className={`flex w-full items-center gap-2 rounded-none px-2 py-2 text-left text-sm transition-colors ${
                          isActive
                            ? "bg-primary/10 font-medium text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {done ? (
                          <CircleCheck className="size-4 shrink-0 text-primary" />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                        )}
                        <span className="truncate">{ch.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* main */}
      <main className="overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {preview && (
            <div className="mb-4 flex items-center gap-2 border border-dashed p-3 text-sm text-muted-foreground">
              <Badge variant="secondary">Preview</Badge>
              You&apos;re viewing the unpublished draft. Learners see the last
              published version.
            </div>
          )}
          {!active ? (
            <div className="rounded-none border border-dashed p-12 text-center text-muted-foreground">
              This course has no chapters yet.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Chapter {activeIndex + 1} of {total}
                  </p>
                  <h1 className="font-heading text-2xl">{active.title}</h1>
                </div>
                {!preview && (
                  <div className="flex items-center gap-2">
                    {!enrolled && isAuthed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEnroll}
                        disabled={pending}
                      >
                        Enroll
                      </Button>
                    )}
                    {!isAuthed && (
                      <Link href="/login">
                        <Button variant="outline" size="sm">
                          Sign in to enroll
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant={
                        completed.has(active.id) ? "secondary" : "default"
                      }
                      onClick={toggleComplete}
                      disabled={pending}
                    >
                      <Check className="size-4" />
                      {completed.has(active.id) ? "Completed" : "Mark complete"}
                    </Button>
                  </div>
                )}
              </div>

              {/* video */}
              <div className="mt-4">
                {active.youtube_video_id ? (
                  <YouTubeEmbed
                    videoId={active.youtube_video_id}
                    title={active.title}
                  />
                ) : (
                  <div className="grid aspect-video place-items-center rounded-none border bg-muted text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Play className="size-8 opacity-40" />
                      <span className="text-sm">No video for this chapter</span>
                    </div>
                  </div>
                )}
              </div>

              {/* tabs */}
              <Tabs defaultValue="about" className="mt-6">
                <TabsList>
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="quiz">Quiz</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="pt-4">
                  {active.description ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {active.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No description for this chapter.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="summary" className="pt-4">
                  <ComingSoon feature="AI summary" />
                </TabsContent>
                <TabsContent value="quiz" className="pt-4">
                  <ComingSoon feature="Chapter quiz" />
                </TabsContent>
                <TabsContent value="chat" className="pt-4">
                  <ComingSoon feature="Chat tutor" />
                </TabsContent>
              </Tabs>

              {/* prev / next */}
              <div className="mt-8 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeIndex <= 0}
                  onClick={() => setActiveId(flat[activeIndex - 1]?.id ?? null)}
                >
                  ← Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeIndex >= total - 1}
                  onClick={() => setActiveId(flat[activeIndex + 1]?.id ?? null)}
                >
                  Next →
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function ComingSoon({ feature }: { feature: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        {/* <Badge variant="secondary">Phase 3</Badge> */}
        <Badge variant="secondary">Comming Soon</Badge>
        <p className="text-sm text-muted-foreground">
          {feature} about the video.
        </p>
      </CardContent>
    </Card>
  );
}
