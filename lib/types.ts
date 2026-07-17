export type CourseStatus = "draft" | "published";
export type AiStatus = "idle" | "processing" | "ready" | "error";

export interface Course {
  id: string;
  author_id: string;
  title: string;
  description: string;
  subject: string;
  status: CourseStatus;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  has_unpublished_changes?: boolean;
}

export interface Unit {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
}

export interface Chapter {
  id: string;
  unit_id: string;
  title: string;
  description: string;
  youtube_url: string | null;
  youtube_video_id: string | null;
  position: number;
  ai_status: AiStatus;
  ai_error: string | null;
}

/** A unit with its ordered chapters — the shape the builder & learner trees use. */
export interface UnitWithChapters extends Unit {
  chapters: Chapter[];
}

/** Full course tree for the builder / learner view. */
export interface CourseTree extends Course {
  units: UnitWithChapters[];
  author_name: string | null;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** Course summary card (grid/dashboard). */
export interface CourseCard {
  id: string;
  title: string;
  description: string;
  subject: string;
  status: CourseStatus;
  cover_url: string | null;
  author_name: string | null;
  chapter_count: number;
  enrollment_count?: number;
  has_unpublished_changes?: boolean;
}

// ── Published snapshot (courses.published_tree) — learner-facing, no answers ──
export interface PublishedChapter {
  id: string;
  title: string;
  description: string;
  youtube_url: string | null;
  youtube_video_id: string | null;
  position: number;
  // Phase 3 adds: summary, quiz (questions/options only), reviewed_by_author
}

export interface PublishedUnit {
  id: string;
  title: string;
  description: string;
  position: number;
  chapters: PublishedChapter[];
}

export interface PublishedTree {
  units: PublishedUnit[];
}
