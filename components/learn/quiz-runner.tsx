"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitQuiz } from "@/lib/actions/ai";
import type { LearnerQuiz } from "@/lib/types";

interface Result {
  score: number;
  total: number;
  results: {
    questionId: string;
    correctIndex: number;
    explanation: string;
    chosenIndex: number;
    correct: boolean;
  }[];
}

export function QuizRunner({
  quiz,
  isAuthed,
}: {
  quiz: LearnerQuiz;
  isAuthed: boolean;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = quiz.questions.every((_, i) => answers[i] !== undefined);

  async function handleSubmit() {
    if (!isAuthed) {
      toast.info("Sign in to take the quiz.");
      return;
    }
    const arr = quiz.questions.map((_, i) => answers[i] ?? -1);
    setSubmitting(true);
    const res = await submitQuiz(quiz.id, arr);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setResult(res);
  }

  return (
    <div className="space-y-6">
      {result && (
        <div className="border bg-muted/40 p-4 text-center">
          <p className="font-heading text-3xl">
            {Math.round((result.score / result.total) * 100)}%
          </p>
          <p className="text-sm text-muted-foreground">
            {result.score} / {result.total} correct
          </p>
        </div>
      )}

      {quiz.questions.map((q, i) => {
        const r = result?.results[i];
        return (
          <div key={q.id} className="space-y-2">
            <p className="font-medium">
              {i + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const chosen = answers[i] === oi;
                const isCorrect = r && oi === r.correctIndex;
                const isWrongChoice = r && r.chosenIndex === oi && !r.correct;
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={!!result}
                    onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                    className={`flex w-full items-center gap-3 border p-3 text-left text-sm transition-colors ${
                      isCorrect
                        ? "border-green-600 bg-green-50 dark:bg-green-950/30"
                        : isWrongChoice
                          ? "border-destructive bg-destructive/10"
                          : chosen
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary"
                    }`}
                  >
                    <span className="grid size-6 shrink-0 place-items-center border text-xs font-semibold">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {isCorrect && (
                      <CheckCircle2 className="size-4 text-green-600" />
                    )}
                    {isWrongChoice && (
                      <XCircle className="size-4 text-destructive" />
                    )}
                  </button>
                );
              })}
            </div>
            {r && (
              <p className="border-l-2 border-muted-foreground/30 pl-3 text-xs text-muted-foreground">
                {r.explanation}
              </p>
            )}
          </div>
        );
      })}

      {!result ? (
        <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
          {submitting ? "Grading…" : "Submit quiz"}
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            setResult(null);
            setAnswers({});
          }}
        >
          Retake quiz
        </Button>
      )}
    </div>
  );
}
