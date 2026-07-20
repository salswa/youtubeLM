"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Play,
  CircleCheck,
  Circle,
  Trophy,
  Lock as LockIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouTubeEmbed } from "@/components/player/youtube-embed";
import { QuizRunner } from "@/components/learn/quiz-runner";
import { ChatPanel } from "@/components/learn/chat-panel";
import { enrollInCourse, setChapterComplete } from "@/lib/actions/enrollment";
import type { LearnerCourse, LearnerChapter } from "@/lib/types";

export function LearnerView({
  course,
  completedIds,
  enrolled,
  isAuthed,
  preview = false,
}: {
  course: LearnerCourse;
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

  const flat = useMemo(
    () => course.units.flatMap((u) => u.chapters),
    [course.units],
  );
  // view is a chapter id, or "final" for the final course quiz
  const [view, setView] = useState<string>(flat[0]?.id ?? "final");

  const active: LearnerChapter | null =
    view === "final"
      ? null
      : (flat.find((c) => c.id === view) ?? flat[0] ?? null);

  const total = flat.length;
  const doneCount = flat.filter((c) => completed.has(c.id)).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  // Summary / Quiz / Chat are for enrolled learners only. The author's own
  // preview stays unlocked so they can review before publishing.
  const locked = !enrolled && !preview;

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
        setCompleted(completed);
      }
    });
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[300px_1fr]">
      {/* sidebar */}
      <aside className="hidden overflow-y-auto border-r bg-card p-4 lg:block">
        {/* <Link
          href="/courses"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← All courses
        </Link> */}
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Button>
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
                  const isActive = ch.id === view;
                  return (
                    <li key={ch.id}>
                      <button
                        onClick={() => setView(ch.id)}
                        className={`flex w-full items-center gap-2 px-2 py-2 text-left text-sm transition-colors ${
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

          {course.final_quiz && (
            <button
              onClick={() => setView("final")}
              className={`flex w-full items-center gap-2 px-2 py-2 text-left text-sm font-medium transition-colors ${
                view === "final"
                  ? "bg-primary/10 text-primary"
                  : "text-primary hover:bg-muted"
              }`}
            >
              <Trophy className="size-4 shrink-0" /> Final course quiz
            </button>
          )}
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

          {view === "final" && course.final_quiz ? (
            <>
              <h1 className="font-heading text-2xl">Final course quiz</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {course.final_quiz.questions.length} questions across the whole
                course.
              </p>
              <div className="mt-6">
                {locked ? (
                  <LockGate
                    noun="final course quiz"
                    isAuthed={isAuthed}
                    onEnroll={handleEnroll}
                    pending={pending}
                  />
                ) : (
                  <QuizRunner quiz={course.final_quiz} isAuthed={isAuthed} />
                )}
              </div>
            </>
          ) : !active ? (
            <div className="border border-dashed p-12 text-center text-muted-foreground">
              This course has no chapters yet.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
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

              <div className="mt-4">
                {active.youtube_video_id ? (
                  <YouTubeEmbed
                    videoId={active.youtube_video_id}
                    title={active.title}
                  />
                ) : (
                  <div className="grid aspect-video place-items-center border bg-muted text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Play className="size-8 opacity-40" />
                      <span className="text-sm">No video for this chapter</span>
                    </div>
                  </div>
                )}
              </div>

              <Tabs defaultValue="summary" className="mt-6">
                <TabsList>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="quiz">Quiz</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="about">About</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="pt-4">
                  {locked ? (
                    <LockGate
                      noun="chapter summary"
                      isAuthed={isAuthed}
                      onEnroll={handleEnroll}
                      pending={pending}
                    />
                  ) : active.summary ? (
                    <div>
                      {/* <Badge
                        variant={
                          active.summary.reviewed_by_author
                            ? "default"
                            : "secondary"
                        }
                        className="mb-3"
                      >
                        {active.summary.reviewed_by_author
                          ? "Reviewed by author"
                          : "AI-generated"}
                      </Badge> */}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {active.summary.content}
                      </div>
                    </div>
                  ) : (
                    <EmptyAi label="No summary yet — the author hasn't generated AI content for this chapter." />
                  )}
                </TabsContent>

                <TabsContent value="quiz" className="pt-4">
                  {locked ? (
                    <LockGate
                      noun="chapter quiz"
                      isAuthed={isAuthed}
                      onEnroll={handleEnroll}
                      pending={pending}
                    />
                  ) : active.quiz && active.quiz.questions.length > 0 ? (
                    <QuizRunner quiz={active.quiz} isAuthed={isAuthed} />
                  ) : (
                    <EmptyAi label="No quiz yet for this chapter." />
                  )}
                </TabsContent>

                <TabsContent value="chat" className="pt-4">
                  {locked ? (
                    <LockGate
                      noun="chat tutor"
                      isAuthed={isAuthed}
                      onEnroll={handleEnroll}
                      pending={pending}
                    />
                  ) : (
                    <ChatPanel chapterId={active.id} isAuthed={isAuthed} />
                  )}
                </TabsContent>

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
              </Tabs>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyAi({ label }: { label: string }) {
  return (
    <div className="border border-dashed p-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

/** Shown in place of Summary/Quiz/Chat for visitors who aren't enrolled. */
function LockGate({
  noun,
  isAuthed,
  onEnroll,
  pending,
}: {
  noun: string;
  isAuthed: boolean;
  onEnroll: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed p-10 text-center">
      <LockIcon className="size-6 text-muted-foreground/60" />
      <p className="max-w-sm text-sm text-muted-foreground">
        {isAuthed
          ? `Enroll in this course to unlock the ${noun}.`
          : `Sign in and enroll to unlock the ${noun}.`}
      </p>
      {isAuthed ? (
        <Button size="sm" onClick={onEnroll} disabled={pending}>
          Enroll to unlock
        </Button>
      ) : (
        <Link href="/login" className={buttonVariants({ size: "sm" })}>
          Enroll to view
        </Link>
      )}
    </div>
  );
}
