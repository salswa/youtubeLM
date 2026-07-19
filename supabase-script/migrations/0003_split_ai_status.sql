-- Phase 3.1 — track summary and quiz generation independently per chapter.
-- Run in the Supabase SQL editor after 0002_snapshot_publish.sql.

alter table public.chapters
  add column if not exists summary_status text not null default 'idle'
    check (summary_status in ('idle', 'processing', 'ready', 'error', 'stale')),
  add column if not exists quiz_status text not null default 'idle'
    check (quiz_status in ('idle', 'processing', 'ready', 'error', 'stale'));

-- Seed the new columns from the existing combined status so current
-- courses keep their generated state.
update public.chapters
  set summary_status = ai_status,
      quiz_status = ai_status
  where ai_status <> 'idle';

-- `ai_status` is kept as a legacy column but no longer used by the app.
