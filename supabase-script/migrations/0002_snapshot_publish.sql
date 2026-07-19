-- Phase 2.5 — snapshot publish, review flags, stale AI status, tightened RLS.
-- Run in the Supabase SQL editor after 0001_init.sql.

-- ── courses: published snapshot + change tracking ───────────────────────────
alter table public.courses
  add column if not exists published_tree jsonb,
  add column if not exists published_at timestamptz,
  add column if not exists has_unpublished_changes boolean not null default false;

-- ── chapters: allow a 'stale' AI status (video changed after generation) ────
alter table public.chapters drop constraint if exists chapters_ai_status_check;
alter table public.chapters
  add constraint chapters_ai_status_check
  check (ai_status in ('idle', 'processing', 'ready', 'error', 'stale'));

-- ── author-review flags on AI content ───────────────────────────────────────
alter table public.summaries
  add column if not exists reviewed_by_author boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.quizzes
  add column if not exists reviewed_by_author boolean not null default false;

-- ── RLS tighten: draft subtree becomes author-only for SELECT ───────────────
-- Learners no longer read normalized rows; they read courses.published_tree.
drop policy if exists "units read" on public.units;
create policy "units read" on public.units
  for select using (public.is_course_author(course_id));

drop policy if exists "chapters read" on public.chapters;
create policy "chapters read" on public.chapters
  for select using (public.is_course_author(public.unit_course(unit_id)));

drop policy if exists "transcripts read" on public.transcripts;
create policy "transcripts read" on public.transcripts
  for select using (public.is_course_author(public.chapter_course(chapter_id)));

drop policy if exists "summaries read" on public.summaries;
create policy "summaries read" on public.summaries
  for select using (public.is_course_author(public.chapter_course(chapter_id)));

drop policy if exists "quizzes read" on public.quizzes;
create policy "quizzes read" on public.quizzes
  for select using (public.is_course_author(course_id));

drop policy if exists "quiz_questions read" on public.quiz_questions;
create policy "quiz_questions read" on public.quiz_questions
  for select using (public.is_course_author(public.quiz_course(quiz_id)));
