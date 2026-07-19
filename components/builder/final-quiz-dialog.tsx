"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AiStatusIcon } from "@/components/builder/ai-status-icon";
import {
  getFinalQuizContent,
  generateFinalCourseQuiz,
  updateQuizQuestion,
} from "@/lib/actions/ai";
import type { AiStatus, ChapterAiContent } from "@/lib/types";

type Q = NonNullable<ChapterAiContent["quiz"]>["questions"][number];

export function FinalQuizDialog({
  courseId,
  status,
  onStatusChange,
}: {
  courseId: string;
  status: AiStatus;
  onStatusChange: (status: AiStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<ChapterAiContent["quiz"]>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const isDirty = (q: Q) => saved[q.id] !== JSON.stringify(q);

  async function load() {
    setLoading(true);
    const data = await getFinalQuizContent(courseId);
    const q = data?.quiz ?? null;
    setQuiz(q);
    setSaved(
      Object.fromEntries((q?.questions ?? []).map((x) => [x.id, JSON.stringify(x)])),
    );
    setLoading(false);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
  }

  function patch(idx: number, p: Partial<Q>) {
    setQuiz((q) =>
      q
        ? {
            ...q,
            questions: q.questions.map((x, i) => (i === idx ? { ...x, ...p } : x)),
          }
        : q,
    );
  }

  async function saveQuestion(q: Q) {
    setBusy(true);
    const res = await updateQuizQuestion(q.id, {
      question: q.question,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setSaved((s) => ({ ...s, [q.id]: JSON.stringify(q) }));
    onStatusChange("ready");
    toast.success("Question saved");
  }

  async function generate() {
    if (quiz && !confirm("Regenerate the final quiz? This overwrites edits.")) {
      return;
    }
    setBusy(true);
    onStatusChange("processing");
    const res = await generateFinalCourseQuiz(courseId, true);
    setBusy(false);
    if (!res.ok) {
      onStatusChange(res.status ?? "error");
      return toast.error(res.error);
    }
    onStatusChange(res.status ?? "ready");
    toast.success("Final quiz generated");
    load();
  }

  const genLabel = !quiz
    ? "Generate final quiz"
    : status === "stale"
      ? "Update quiz"
      : "Regenerate";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-none border bg-card p-3 text-left text-sm font-medium hover:bg-muted"
          >
            <Trophy className="size-4 shrink-0 text-primary" />
            <span className="flex-1">Final course quiz</span>
            {status === "stale" && (
              <Badge variant="secondary" className="shrink-0">
                Needs update
              </Badge>
            )}
            <AiStatusIcon status={status} />
          </button>
        }
      />
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Final course quiz</DialogTitle>
          <DialogDescription>
            One quiz covering the whole course, built from every chapter
            summary. Generate it on demand.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          {status === "stale" ? (
            <Badge variant="secondary">Needs update — content changed</Badge>
          ) : quiz?.reviewed_by_author ? (
            <Badge>Reviewed by author</Badge>
          ) : quiz ? (
            <Badge variant="secondary">AI-generated</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">
              Not generated yet
            </span>
          )}
          <Button variant="outline" size="sm" onClick={generate} disabled={busy}>
            <RefreshCw className="size-4" /> {genLabel}
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : !quiz ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No final quiz yet. Generate chapter summaries first, then create it
            here.
          </p>
        ) : (
          <div className="space-y-5">
            {quiz.questions.map((q, idx) => (
              <div key={q.id} className="space-y-2 border p-3">
                <Input
                  value={q.question}
                  onChange={(e) => patch(idx, { question: e.target.value })}
                />
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`final-correct-${q.id}`}
                      checked={q.correct_index === oi}
                      onChange={() => patch(idx, { correct_index: oi })}
                    />
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const options = [...q.options];
                        options[oi] = e.target.value;
                        patch(idx, { options });
                      }}
                      className="h-8"
                    />
                  </div>
                ))}
                <Textarea
                  value={q.explanation}
                  onChange={(e) => patch(idx, { explanation: e.target.value })}
                  placeholder="Explanation"
                  className="min-h-16 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveQuestion(q)}
                  disabled={busy || !isDirty(q)}
                >
                  Save question
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
