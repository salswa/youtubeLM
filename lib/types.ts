export type CourseStatus = "draft" | "published";
export type AiStatus = "idle" | "processing" | "ready" | "error" | "stale";

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
export interface PublishedQuizQuestion {
  id: string;
  question: string;
  options: string[];
  position: number;
  // no correct_index / explanation — those stay server-side (see submitQuiz)
}

export interface PublishedQuiz {
  id: string;
  reviewed_by_author: boolean;
  questions: PublishedQuizQuestion[];
}

export interface PublishedSummary {
  content: string;
  reviewed_by_author: boolean;
}

export interface PublishedChapter {
  id: string;
  title: string;
  description: string;
  youtube_url: string | null;
  youtube_video_id: string | null;
  position: number;
  summary: PublishedSummary | null;
  quiz: PublishedQuiz | null;
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
  final_quiz: PublishedQuiz | null;
}

// ── Learner-facing course (from the snapshot, or a draft for author preview) ──
export type LearnerQuizQuestion = PublishedQuizQuestion;
export type LearnerQuiz = PublishedQuiz;

export interface LearnerChapter {
  id: string;
  title: string;
  description: string;
  youtube_video_id: string | null;
  summary: PublishedSummary | null;
  quiz: LearnerQuiz | null;
}

export interface LearnerUnit {
  id: string;
  title: string;
  chapters: LearnerChapter[];
}

export interface LearnerCourse {
  id: string;
  title: string;
  author_name: string | null;
  units: LearnerUnit[];
  final_quiz: LearnerQuiz | null;
}

// ── Author-side AI content (draft, from normalized tables) ───────────────────
export interface ChapterAiContent {
  chapterId: string;
  summary: { content: string; reviewed_by_author: boolean } | null;
  quiz: {
    id: string;
    reviewed_by_author: boolean;
    questions: {
      id: string;
      question: string;
      options: string[];
      correct_index: number;
      explanation: string;
      position: number;
    }[];
  } | null;
}
