-- TaskHop initial schema: profiles, skills, user_skills, tasks, task_skills.
-- Run this once in the Supabase SQL Editor (or via `supabase db push`) on a
-- fresh project. Safe to re-run only after dropping the objects it creates.

-- ---------------------------------------------------------------------------
-- profiles
-- One row per authenticated user, created automatically on signup (trigger
-- below). id is shared with auth.users so RLS can key off auth.uid().
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  avatar_url text,
  bio text,
  location text,
  availability text not null default 'available_now'
    check (availability in ('available_now', 'available_soon', 'busy')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Public-facing profile for each authenticated user.';

-- ---------------------------------------------------------------------------
-- skills
-- Shared skill vocabulary. Grows organically as users type new skills on the
-- Create Task / Edit Profile screens (upsert-by-name from the client).
-- ---------------------------------------------------------------------------
-- `name` is stored pre-normalized (trimmed, title-cased) by the client via
-- normalizeSkillName() before every insert/upsert, so a plain unique
-- constraint is enough to dedupe -- no case-folding expression index needed,
-- which keeps client-side `upsert(..., { onConflict: 'name' })` calls simple.
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_skills (join: profiles <-> skills)
-- ---------------------------------------------------------------------------
create table if not exists public.user_skills (
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create index if not exists user_skills_skill_id_idx on public.user_skills (skill_id);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  deadline date,
  status text not null default 'open'
    check (status in ('open', 'matching', 'in_progress', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists tasks_created_by_idx on public.tasks (created_by);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_category_idx on public.tasks (category);
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

-- ---------------------------------------------------------------------------
-- task_skills (join: tasks <-> skills)
-- ---------------------------------------------------------------------------
create table if not exists public.task_skills (
  task_id uuid not null references public.tasks (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (task_id, skill_id)
);

create index if not exists task_skills_skill_id_idx on public.task_skills (skill_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up.
-- Name comes from the `name` field passed in supabase.auth.signUp options.data.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Browsing (profiles/skills/tasks) stays public so the Home feed and
-- matching can work without forcing a login wall. Writes are scoped to the
-- authenticated owner.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.tasks enable row level security;
alter table public.task_skills enable row level security;

-- profiles
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- skills (shared vocabulary: anyone signed in can add a new skill; nobody
-- can edit/delete existing ones from the client)
create policy "skills are publicly readable"
  on public.skills for select
  using (true);

create policy "authenticated users can add skills"
  on public.skills for insert
  to authenticated
  with check (true);

-- Needed so client-side `upsert(..., { onConflict: 'name' })` calls can hit
-- the ON CONFLICT DO UPDATE branch for a skill another user already added.
-- skills has no owner column (it's shared vocabulary, not user data), so
-- this can't be scoped tighter than "any authenticated user".
create policy "authenticated users can update skills"
  on public.skills for update
  to authenticated
  using (true)
  with check (true);

-- user_skills
create policy "user skills are publicly readable"
  on public.user_skills for select
  using (true);

create policy "users manage their own skills"
  on public.user_skills for insert
  with check (auth.uid() = user_id);

create policy "users remove their own skills"
  on public.user_skills for delete
  using (auth.uid() = user_id);

-- tasks
create policy "tasks are publicly readable"
  on public.tasks for select
  using (true);

create policy "users create their own tasks"
  on public.tasks for insert
  with check (auth.uid() = created_by);

create policy "users update their own tasks"
  on public.tasks for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- task_skills (ownership checked via the parent task)
create policy "task skills are publicly readable"
  on public.task_skills for select
  using (true);

create policy "users manage skills on their own tasks"
  on public.task_skills for insert
  with check (
    exists (
      select 1 from public.tasks
      where tasks.id = task_skills.task_id
        and tasks.created_by = auth.uid()
    )
  );

create policy "users remove skills on their own tasks"
  on public.task_skills for delete
  using (
    exists (
      select 1 from public.tasks
      where tasks.id = task_skills.task_id
        and tasks.created_by = auth.uid()
    )
  );
