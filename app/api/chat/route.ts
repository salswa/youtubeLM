import { streamText } from "ai";
import { geminiModel } from "@/lib/ai/gemini";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const { chapterId, messages } = (await req.json()) as {
    chapterId?: string;
    messages?: ChatMessage[];
  };

  if (!chapterId || !messages) {
    return new Response("Bad request", { status: 400 });
  }

  const admin = createAdminClient();

  const { data: chapter } = await admin
    .from("chapters")
    .select("unit_id, title")
    .eq("id", chapterId)
    .single();
  if (!chapter) return new Response("Not found", { status: 404 });

  const { data: unit } = await admin
    .from("units")
    .select("course_id")
    .eq("id", chapter.unit_id)
    .single();
  const { data: course } = await admin
    .from("courses")
    .select("author_id, status")
    .eq("id", unit?.course_id ?? "")
    .single();

  const user = await getUser();
  const allowed =
    course?.status === "published" || (!!user && user.id === course?.author_id);
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const { data: transcript } = await admin
    .from("transcripts")
    .select("content")
    .eq("chapter_id", chapterId)
    .maybeSingle();

  if (!transcript?.content) {
    return new Response(
      "There's no transcript for this chapter yet, so I can't answer questions about it.",
      { status: 200, headers: { "Content-Type": "text/plain" } },
    );
  }

  const system =
    `You are a friendly tutor for the video chapter "${chapter.title}". ` +
    "Answer the learner's questions using ONLY the transcript below. If the answer " +
    "isn't in the transcript, say you don't know based on this video. Keep answers " +
    "concise and clear.\n\nTRANSCRIPT:\n" +
    transcript.content;

  const result = streamText({
    model: geminiModel(),
    system,
    messages,
  });

  return result.toTextStreamResponse();
}
