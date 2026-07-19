"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
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
import {
  AiStatusIcon,
  aiStatusLabel,
} from "@/components/builder/ai-status-icon";
import {
  getChapterAiContent,
  updateQuizQuestion,
  regenerateQuiz,
} from "@/lib/actions/ai";
import type { AiStatus, ChapterAiContent } from "@/lib/types";

type Q = NonNullable<ChapterAiContent["quiz"]>["questions"][number];

export function ChapterQuizDialog({
  chapterId,
  status,
  onStatusChange,
}: {
  chapterId: string;
  status: AiStatus;
  onStatusChange: (id: string, status: AiStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<ChapterAiContent["quiz"]>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const isDirty = (q: Q) => saved[q.id] !== JSON.stringify(q);

  async function load() {
    setLoading(true);
    const data = await getChapterAiContent(chapterId);
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
        ? { ...q, questions: q.questions.map((x, i) => (i === idx ? { ...x, ...p } : x)) }
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
    onStatusChange(chapterId, "ready");
    toast.success("Question saved");
  }

  async function regenerate() {
    if (quiz && !confirm("Regenerate the quiz? This overwrites edits.")) return;
    setBusy(true);
    onStatusChange(chapterId, "processing");
    const res = await regenerateQuiz(chapterId);
    setBusy(false);
    if (!res.ok) {
      onStatusChange(chapterId, "error");
      return toast.error(res.error);
    }
    onStatusChange(chapterId, res.status);
    toast.success("Quiz generated");
    load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" title={aiStatusLabel(status)}>
            <AiStatusIcon status={status} /> Quiz
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Chapter quiz</DialogTitle>
          <DialogDescription>
            Edit questions (saving marks the quiz reviewed) or regenerate from
            the video.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          {quiz?.reviewed_by_author ? (
            <Badge>Reviewed by author</Badge>
          ) : quiz ? (
            <Badge variant="secondary">AI-generated</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">
              Not generated yet
            </span>
          )}
          <Button variant="outline" size="sm" onClick={regenerate} disabled={busy}>
            <RefreshCw className="size-4" />
            {quiz ? "Regenerate" : "Generate"}
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : !quiz ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No quiz yet — click Generate.
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
                      name={`correct-${q.id}`}
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
