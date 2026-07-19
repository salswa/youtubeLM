-- YouTubeLM — initial schema, RLS, and triggers
-- Run in the Supabase SQL editor (or via the Supabase CLI).

create extension if not exists pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  description text not null default '',
  subject     text not null default '',
  status      text not null default 'draft' check (status in ('draft', 'published')),
  cover_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index courses_author_idx on public.courses (author_id);
create index courses_status_idx on public.courses (status);

create table public.units (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text not null,
  description text not null default '',
  position    integer not null default 0
);
create index units_course_idx on public.units (course_id);

create table public.chapters (
  id               uuid primary key default gen_random_uuid(),
  unit_id          uuid not null references public.units (id) on delete cascade,
  title            text not null,
  description      text not null default '',
  youtube_url      text,
  youtube_video_id text,
  position         integer not null default 0,
  ai_status        text not null default 'idle'
                     check (ai_status in ('idle', 'processing', 'ready', 'error')),
  ai_error         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index chapters_unit_idx on public.chapters (unit_id);

create table public.transcripts (
  id         uuid primary key default gen_random_uuid(),
  chapter_id uuid not null unique references public.chapters (id) on delete cascade,
  content    text not null,
  language   text not null default 'en',
  created_at timestamptz not null default now()
);

create table public.summaries (
  id         uuid primary key default gen_random_uuid(),
  chapter_id uuid not null unique references public.chapters (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create table public.quizzes (
  id         uuid primary key default gen_random_uuid(),
  scope      text not null check (scope in ('chapter', 'course')),
  course_id  uuid not null references public.courses (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index quizzes_course_idx on public.quizzes (course_id);
create index quizzes_chapter_idx on public.quizzes (chapter_id);

create table public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes (id) on delete cascade,
  question      text not null,
  options       jsonb not null,
  correct_index integer not null,
  explanation   text not null default '',
  position      integer not null default 0
);
create index quiz_questions_quiz_idx on public.quiz_questions (quiz_id);

create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);
create index chat_messages_chapter_user_idx on public.chat_messages (chapter_id, user_id);

create table public.enrollments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  course_id  uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  chapter_id   uuid not null references public.chapters (id) on delete cascade,
  completed    boolean not null default true,
  completed_at timestamptz not null default now(),
  unique (user_id, chapter_id)
);

create table public.quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  quiz_id    uuid not null references public.quizzes (id) on delete cascade,
  score      integer not null,
  answers    jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- HELPER FUNCTIONS (security definer to avoid recursive RLS)
-- ============================================================

create or replace function public.is_course_author(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.courses c
    where c.id = cid and c.author_id = auth.uid()
  );
$$;

create or replace function public.is_course_readable(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.courses c
    where c.id = cid and (c.status = 'published' or c.author_id = auth.uid())
  );
$$;

create or replace function public.unit_course(uid uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select course_id from public.units where id = uid;
$$;

create or replace function public.chapter_course(chid uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select u.course_id from public.chapters c
  join public.units u on u.id = c.unit_id
  where c.id = chid;
$$;

create or replace function public.quiz_course(qid uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select course_id from public.quizzes where id = qid;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.courses        enable row level security;
alter table public.units          enable row level security;
alter table public.chapters       enable row level security;
alter table public.transcripts    enable row level security;
alter table public.summaries      enable row level security;
alter table public.quizzes        enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.chat_messages  enable row level security;
alter table public.enrollments    enable row level security;
alter table public.progress       enable row level security;
alter table public.quiz_attempts  enable row level security;

-- profiles: world-readable (author names), self-editable
create policy "profiles readable" on public.profiles
  for select using (true);
create policy "profiles update own" on public.profiles
  for update using (id = auth.uid());

-- courses: read published or own; author manages own
create policy "courses read" on public.courses
  for select using (status = 'published' or author_id = auth.uid());
create policy "courses insert own" on public.courses
  for insert with check (author_id = auth.uid());
create policy "courses update own" on public.courses
  for update using (author_id = auth.uid());
create policy "courses delete own" on public.courses
  for delete using (author_id = auth.uid());

-- units: readable with course; managed by course author
create policy "units read" on public.units
  for select using (public.is_course_readable(course_id));
create policy "units write" on public.units
  for all using (public.is_course_author(course_id))
  with check (public.is_course_author(course_id));

-- chapters: readable with course; managed by course author
create policy "chapters read" on public.chapters
  for select using (public.is_course_readable(public.unit_course(unit_id)));
create policy "chapters write" on public.chapters
  for all using (public.is_course_author(public.unit_course(unit_id)))
  with check (public.is_course_author(public.unit_course(unit_id)));

-- transcripts/summaries: readable with course (writes happen via service role)
create policy "transcripts read" on public.transcripts
  for select using (public.is_course_readable(public.chapter_course(chapter_id)));
create policy "summaries read" on public.summaries
  for select using (public.is_course_readable(public.chapter_course(chapter_id)));

-- quizzes/questions: readable with course (writes via service role)
create policy "quizzes read" on public.quizzes
  for select using (public.is_course_readable(course_id));
create policy "quiz_questions read" on public.quiz_questions
  for select using (public.is_course_readable(public.quiz_course(quiz_id)));

-- chat: user owns their messages (only in readable courses)
create policy "chat read own" on public.chat_messages
  for select using (user_id = auth.uid());
create policy "chat insert own" on public.chat_messages
  for insert with check (
    user_id = auth.uid()
    and public.is_course_readable(public.chapter_course(chapter_id))
  );
create policy "chat delete own" on public.chat_messages
  for delete using (user_id = auth.uid());

-- enrollments: user owns
create policy "enrollments read own" on public.enrollments
  for select using (user_id = auth.uid());
create policy "enrollments insert own" on public.enrollments
  for insert with check (
    user_id = auth.uid() and public.is_course_readable(course_id)
  );
create policy "enrollments delete own" on public.enrollments
  for delete using (user_id = auth.uid());

-- progress: user owns
create policy "progress read own" on public.progress
  for select using (user_id = auth.uid());
create policy "progress write own" on public.progress
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- quiz attempts: user owns
create policy "attempts read own" on public.quiz_attempts
  for select using (user_id = auth.uid());
create policy "attempts insert own" on public.quiz_attempts
  for insert with check (user_id = auth.uid());

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enforce max 3 authored courses per user.
create or replace function public.enforce_course_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cnt integer;
begin
  select count(*) into cnt from public.courses where author_id = new.author_id;
  if cnt >= 3 then
    raise exception 'Course limit reached: a user may create at most 3 courses.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger courses_enforce_limit
  before insert on public.courses
  for each row execute function public.enforce_course_limit();

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

create trigger chapters_set_updated_at
  before update on public.chapters
  for each row execute function public.set_updated_at();
