import { z } from "zod";

/** Extract the 11-char video id from any common YouTube URL form. */
export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export const youtubeUrlSchema = z
  .string()
  .trim()
  .refine((url) => extractYoutubeId(url) !== null, {
    message: "Enter a valid YouTube video URL",
  });

export const courseSchema = z.object({
  title: z.string().min(3, "Title is too short").max(120),
  description: z.string().max(2000).optional().default(""),
  subject: z.string().max(60).optional().default(""),
});
export type CourseInput = z.infer<typeof courseSchema>;

export const unitSchema = z.object({
  title: z.string().min(1, "Unit needs a title").max(120),
  description: z.string().max(1000).optional().default(""),
});
export type UnitInput = z.infer<typeof unitSchema>;

export const chapterSchema = z.object({
  title: z.string().min(1, "Chapter needs a title").max(160),
  description: z.string().max(1000).optional().default(""),
  youtubeUrl: youtubeUrlSchema.optional().or(z.literal("")),
});
export type ChapterInput = z.infer<typeof chapterSchema>;
