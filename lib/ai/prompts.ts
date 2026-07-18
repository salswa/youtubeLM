import { z } from "zod";

export const TRANSCRIBE_PROMPT =
  "You are a transcription engine. Transcribe the spoken content of this video " +
  "verbatim into clean, readable paragraphs. Include everything that is said. " +
  "Do not summarize, add commentary, timestamps, or speaker labels unless multiple " +
  "distinct speakers are clearly present. Output only the transcript text.";

export function buildSummaryPrompt(transcript: string): string {
  return (
    "Summarize the following video transcript for a learner studying this topic. " +
    "Write clean Markdown: a short intro paragraph, then a `Key ideas` section with " +
    "3-6 bullet points, then a one-paragraph takeaway. Be faithful to the transcript — " +
    "do not invent facts.\n\nTRANSCRIPT:\n" +
    transcript
  );
}

// NOTE: avoid z.union / z.record with the Google provider (known to misbehave).
export const quizQuestionSchema = z.object({
  question: z.string().describe("A clear, single-answer multiple-choice question"),
  options: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("Answer options (3-5); exactly one is correct"),
  correctIndex: z
    .number()
    .int()
    .min(0)
    .describe("0-based index of the correct option"),
  explanation: z.string().describe("A brief explanation of why it is correct"),
});
export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema),
});
export type QuizQuestionData = z.infer<typeof quizQuestionSchema>;

export function buildQuizPrompt(transcript: string, count: number): string {
  return (
    `From the transcript below, write ${count} multiple-choice questions that test ` +
    "understanding of the key concepts. Each question has 4 options with exactly one " +
    "correct answer and a brief explanation. Base every question strictly on the " +
    "transcript.\n\nTRANSCRIPT:\n" +
    transcript
  );
}

export function buildFinalQuizPrompt(summaries: string[], count: number): string {
  return (
    `You are creating a final course quiz. Using the chapter summaries below, write ` +
    `${count} multiple-choice questions covering the whole course. Each has 4 options, ` +
    "exactly one correct, with a brief explanation.\n\nCHAPTER SUMMARIES:\n" +
    summaries.map((s, i) => `## Chapter ${i + 1}\n${s}`).join("\n\n")
  );
}
