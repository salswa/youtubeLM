-- Phase 3.2 — track the final course quiz status independently so it is only
-- (re)generated on demand, not on every chapter change.
-- Run in the Supabase SQL editor after 0003_split_ai_status.sql.

alter table public.courses
  add column if not exists final_quiz_status text not null default 'idle'
    check (final_quiz_status in ('idle', 'processing', 'ready', 'error', 'stale'));

-- Courses that already have a final quiz are marked ready.
update public.courses c
  set final_quiz_status = 'ready'
  where exists (
    select 1 from public.quizzes q
    where q.course_id = c.id and q.scope = 'course'
  );
