import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import {
  TRANSCRIBE_PROMPT,
  buildSummaryPrompt,
  buildQuizPrompt,
  buildFinalQuizPrompt,
  quizSchema,
  type QuizQuestionData,
} from "@/lib/ai/prompts";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// export const GEMINI_MODEL = "gemini-2.5-flash";

const GEMINI_MODEL = "gemini-flash-latest";

/** Shared model handle (e.g. for streaming chat). */
export function geminiModel() {
  return google(GEMINI_MODEL);
}

/** Transcribe a YouTube video by passing its URL straight to Gemini. */
export async function transcribeYouTube(youtubeUrl: string): Promise<string> {
  const { text } = await generateText({
    model: google(GEMINI_MODEL),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: TRANSCRIBE_PROMPT },
          { type: "file", data: youtubeUrl, mediaType: "video/mp4" },
        ],
      },
    ],
  });
  return text.trim();
}

/** Markdown study summary from a stored transcript. */
export async function summarizeTranscript(transcript: string): Promise<string> {
  const { text } = await generateText({
    model: google(GEMINI_MODEL),
    prompt: buildSummaryPrompt(transcript),
  });
  return text.trim();
}

/** Sanitize model output: clamp correctIndex into the options range. */
function normalize(questions: QuizQuestionData[]): QuizQuestionData[] {
  return questions.map((q) => ({
    ...q,
    correctIndex: Math.min(Math.max(q.correctIndex, 0), q.options.length - 1),
  }));
}

export async function generateChapterQuiz(
  transcript: string,
  count = 5,
): Promise<QuizQuestionData[]> {
  const { object } = await generateObject({
    model: google(GEMINI_MODEL),
    schema: quizSchema,
    prompt: buildQuizPrompt(transcript, count),
  });
  return normalize(object.questions);
}

export async function generateFinalQuiz(
  summaries: string[],
  count = 8,
): Promise<QuizQuestionData[]> {
  const { object } = await generateObject({
    model: google(GEMINI_MODEL),
    schema: quizSchema,
    prompt: buildFinalQuizPrompt(summaries, count),
  });
  return normalize(object.questions);
}
