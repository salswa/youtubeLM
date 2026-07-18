"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getChapterAiContent,
  updateSummary,
  updateQuizQuestion,
  regenerateChapterAI,
} from "@/lib/actions/ai";
import type { AiStatus, ChapterAiContent } from "@/lib/types";

type EditableQuestion = NonNullable<ChapterAiContent["quiz"]>["questions"][number];

export function ChapterAiDialog({
  chapterId,
  onAiStatusChange,
}: {
  chapterId: string;
  onAiStatusChange: (id: string, status: AiStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<ChapterAiContent | null>(null);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const data = await getChapterAiContent(chapterId);
    setContent(data);
    setSummary(data?.summary?.content ?? "");
    setLoading(false);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
  }

  async function saveSummary() {
    setBusy(true);
    const res = await updateSummary(chapterId, summary);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Summary saved & marked reviewed");
    setContent((c) =>
      c ? { ...c, summary: { content: summary, reviewed_by_author: true } } : c,
    );
  }

  async function saveQuestion(q: EditableQuestion) {
    setBusy(true);
    const res = await updateQuizQuestion(q.id, {
      question: q.question,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Question saved");
  }

  async function regenerate() {
    if (!confirm("Regenerate AI for this chapter? This overwrites edits.")) return;
    setBusy(true);
    onAiStatusChange(chapterId, "processing");
    const res = await regenerateChapterAI(chapterId);
    setBusy(false);
    if (!res.ok) {
      onAiStatusChange(chapterId, "error");
      return toast.error(res.error);
    }
    onAiStatusChange(chapterId, res.status);
    toast.success("Regenerated");
    load();
  }

  function updateQuestion(idx: number, patch: Partial<EditableQuestion>) {
    setContent((c) => {
      if (!c?.quiz) return c;
      const questions = c.quiz.questions.map((q, i) =>
        i === idx ? { ...q, ...patch } : q,
      );
      return { ...c, quiz: { ...c.quiz, questions } };
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Review AI content">
            <Sparkles className="size-4" />
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Review AI content</DialogTitle>
          <DialogDescription>
            Edit the AI-generated summary and quiz. Saving marks them as
            reviewed by you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={regenerate}
            disabled={busy}
          >
            <RefreshCw className="size-4" /> Regenerate
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : !content || (!content.summary && !content.quiz) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No AI content yet. Save the course, then use{" "}
            <strong>Generate AI</strong> to create it.
          </p>
        ) : (
          <div className="space-y-6">
            {/* summary */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Label>Summary</Label>
                {content.summary?.reviewed_by_author && (
                  <Badge variant="default">Reviewed</Badge>
                )}
              </div>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="min-h-40"
              />
              <Button
                size="sm"
                className="mt-2"
                onClick={saveSummary}
                disabled={busy}
              >
                Save summary
              </Button>
            </section>

            {/* quiz */}
            {content.quiz && (
              <section className="space-y-5">
                <Label>Quiz questions</Label>
                {content.quiz.questions.map((q, idx) => (
                  <div key={q.id} className="space-y-2 border p-3">
                    <Input
                      value={q.question}
                      onChange={(e) =>
                        updateQuestion(idx, { question: e.target.value })
                      }
                    />
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correct_index === oi}
                          onChange={() =>
                            updateQuestion(idx, { correct_index: oi })
                          }
                        />
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const options = [...q.options];
                            options[oi] = e.target.value;
                            updateQuestion(idx, { options });
                          }}
                          className="h-8"
                        />
                      </div>
                    ))}
                    <Textarea
                      value={q.explanation}
                      onChange={(e) =>
                        updateQuestion(idx, { explanation: e.target.value })
                      }
                      placeholder="Explanation"
                      className="min-h-16 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveQuestion(q)}
                      disabled={busy}
                    >
                      Save question
                    </Button>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
