-- TaskHop: connection/interest flow between task owners and potential helpers.
-- Adds a single table on top of 0001_init.sql. Run once in the Supabase SQL
-- Editor (or via `supabase db push`) after 0001_init.sql.

-- ---------------------------------------------------------------------------
-- task_interests
-- A helper expressing interest in someone else's task. This is the
-- connection primitive messaging will build on later -- not chat itself.
-- ---------------------------------------------------------------------------
create table if not exists public.task_interests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, helper_id)
);

create index if not exists task_interests_task_id_idx on public.task_interests (task_id);
create index if not exists task_interests_helper_id_idx on public.task_interests (helper_id);

comment on table public.task_interests is
  'A helper expressing interest in a task. Unique per (task, helper) to prevent duplicates.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Unlike profiles/skills/tasks, interest records are not public: only the
-- helper who expressed interest and the task's owner can see them.
-- ---------------------------------------------------------------------------
alter table public.task_interests enable row level security;

create policy "helper or task owner can view interest rows"
  on public.task_interests for select
  using (
    auth.uid() = helper_id
    or exists (
      select 1 from public.tasks
      where tasks.id = task_interests.task_id
        and tasks.created_by = auth.uid()
    )
  );

-- A user can only ever record interest as themselves, and never on a task
-- they own -- enforced here, not just in the client (see requirement that
-- RLS must authorize who can create/manage these rows).
create policy "users express interest as themselves on tasks they do not own"
  on public.task_interests for insert
  with check (
    auth.uid() = helper_id
    and not exists (
      select 1 from public.tasks
      where tasks.id = task_interests.task_id
        and tasks.created_by = auth.uid()
    )
  );

create policy "users withdraw their own interest"
  on public.task_interests for delete
  using (auth.uid() = helper_id);
