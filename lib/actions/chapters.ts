"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { extractYoutubeId } from "@/lib/schemas/course";
import type { Chapter } from "@/lib/types";

export async function addChapter(unitId: string) {
  await requireUser();
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("chapters")
    .select("position")
    .eq("unit_id", unitId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("chapters")
    .insert({ unit_id: unitId, title: "New chapter", position })
    .select("*")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, chapter: data as Chapter };
}

export async function updateChapter(
  chapterId: string,
  input: { title?: string; description?: string },
) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("chapters")
    .update(input)
    .eq("id", chapterId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** Set (or clear) a chapter's YouTube video. Empty string clears it. */
export async function setChapterVideo(chapterId: string, url: string) {
  await requireUser();
  const trimmed = url.trim();

  if (trimmed === "") {
    const supabase = await createClient();
    const { error } = await supabase
      .from("chapters")
      .update({ youtube_url: null, youtube_video_id: null })
      .eq("id", chapterId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, videoId: null };
  }

  const videoId = extractYoutubeId(trimmed);
  if (!videoId) {
    return { ok: false as const, error: "Enter a valid YouTube video URL." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("chapters")
    .update({ youtube_url: trimmed, youtube_video_id: videoId })
    .eq("id", chapterId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, videoId };
}

export async function deleteChapter(chapterId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("chapters")
    .delete()
    .eq("id", chapterId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/**
 * Persist chapter ordering, including cross-unit moves. `updates` lists every
 * affected chapter with its new unit_id and position.
 */
export async function reorderChapters(
  updates: { id: string; unitId: string; position: number }[],
) {
  await requireUser();
  const supabase = await createClient();
  const results = await Promise.all(
    updates.map((u) =>
      supabase
        .from("chapters")
        .update({ unit_id: u.unitId, position: u.position })
        .eq("id", u.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false as const, error: failed.error.message };
  return { ok: true as const };
}
