-- Denormalized learner count on courses.
--
-- Why: `enrollments` RLS restricts SELECT to the row's owner
-- (`user_id = auth.uid()`), so an embedded `enrollments(count)` aggregate only
-- ever counted the *current viewer's* own enrollment — 0 for logged-out
-- visitors, 0/1 for an author. This keeps a maintained total on the course row
-- so the count is public and correct, without exposing who enrolled.
-- Run in the Supabase SQL editor after 0004_final_quiz_status.sql.

alter table public.courses
  add column if not exists enrollment_count integer not null default 0;

-- Backfill from existing enrollments.
update public.courses c
  set enrollment_count = (
    select count(*) from public.enrollments e where e.course_id = c.id
  );

-- Keep the counter in sync. SECURITY DEFINER so the enrolling/unenrolling user
-- can update the course row despite RLS.
create or replace function public.sync_enrollment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.courses
      set enrollment_count = enrollment_count + 1
      where id = new.course_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.courses
      set enrollment_count = greatest(enrollment_count - 1, 0)
      where id = old.course_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists enrollment_count_sync on public.enrollments;
create trigger enrollment_count_sync
  after insert or delete on public.enrollments
  for each row execute function public.sync_enrollment_count();
