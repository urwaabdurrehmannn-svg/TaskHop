-- TaskHop: Trust & Safety foundation -- reports, blocks, and block
-- enforcement on new connections/invites/messages.
--
-- Deliberately NOT touched by this migration: task ownership policies,
-- task_interests SELECT/DELETE policies, messages SELECT policy, soft-delete
-- (deleted_at) behavior, or the matching/scoring logic (that's app-level,
-- see matchService.ts). Existing history stays fully readable -- only new
-- INSERTs are additionally gated.
--
-- Run once in the Supabase SQL Editor (or via `supabase db push`) after
-- 0008_task_soft_delete.sql.

-- ---------------------------------------------------------------------------
-- reports
-- One table for both "report a user" and "report a task" -- a target_type
-- discriminator plus a check constraint keeps exactly one target column
-- populated, avoiding a duplicate reason/status/description schema per
-- target type. No moderation UI exists yet (see comment at the bottom);
-- reports are stored for a future admin/moderation pass to process.
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('user', 'task')),
  reported_user_id uuid references public.profiles (id) on delete cascade,
  reported_task_id uuid references public.tasks (id) on delete cascade,
  reason text not null check (
    reason in ('scam_fraud', 'harassment', 'fake_information', 'inappropriate_behavior', 'spam', 'other')
  ),
  description text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  constraint reports_target_matches_type check (
    (target_type = 'user' and reported_user_id is not null and reported_task_id is null)
    or
    (target_type = 'task' and reported_task_id is not null and reported_user_id is null)
  ),
  constraint reports_no_self_report check (reported_user_id is null or reported_user_id != reporter_id)
);

create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_reported_user_id_idx on public.reports (reported_user_id);
create index if not exists reports_reported_task_id_idx on public.reports (reported_task_id);
create index if not exists reports_status_idx on public.reports (status);

-- One open report per (reporter, target) at a time -- prevents accidental
-- duplicate-tap reports without blocking a genuinely new incident once a
-- prior report has been reviewed/resolved.
create unique index if not exists reports_unique_open_user_report
  on public.reports (reporter_id, reported_user_id)
  where target_type = 'user' and status = 'open';
create unique index if not exists reports_unique_open_task_report
  on public.reports (reporter_id, reported_task_id)
  where target_type = 'task' and status = 'open';

comment on table public.reports is
  'User- or task-directed reports for future moderation. reporter_id is only ever trusted via auth.uid() through RLS, never a client-supplied value.';

alter table public.reports enable row level security;

-- Reporters can only ever submit as themselves, and never report themselves.
create policy "users create their own reports"
  on public.reports for insert
  with check (
    auth.uid() = reporter_id
    and (reported_user_id is null or reported_user_id != auth.uid())
  );

-- A reporter can see their own submitted reports (e.g. to avoid duplicate
-- submission) -- nobody can read reports made about them or about others.
-- No UPDATE/DELETE policy: reports are immutable from the client: moderation
-- status changes are for a future admin/service-role process, not this app.
create policy "users view their own submitted reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- blocks
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  constraint blocks_no_self_block check (blocker_id != blocked_id)
);

create index if not exists blocks_blocker_id_idx on public.blocks (blocker_id);
create index if not exists blocks_blocked_id_idx on public.blocks (blocked_id);

comment on table public.blocks is
  'One-directional block: blocker_id no longer wants new connections/messages with blocked_id. Enforced going forward only -- existing task_interests/messages are never deleted or hidden because of a block.';

alter table public.blocks enable row level security;

-- Visible to both sides of a block (not just the blocker). This is
-- deliberate, not an oversight: the task_interests/messages INSERT policies
-- below need to detect a block regardless of which party is the one
-- attempting the write, and RLS subqueries against `blocks` run as the
-- querying role -- if only the blocker could see the row, the blocked
-- party's own insert attempts could not see it and the block would be
-- bypassable from one direction. The tradeoff: a blocked user can see that
-- a specific block row involving them exists. They still cannot see any
-- block that doesn't involve them.
create policy "users view blocks involving themselves"
  on public.blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "users create their own blocks"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

create policy "users delete their own blocks"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

-- No UPDATE policy: a block is either created or removed, never edited.

-- ---------------------------------------------------------------------------
-- Block enforcement on NEW task_interests rows.
-- Additive only: both existing INSERT policies (0006_owner_invite.sql) keep
-- every one of their current conditions unchanged, gaining exactly one more
-- AND clause each. SELECT and DELETE policies on task_interests are not
-- touched, so existing connections remain fully visible/manageable.
-- ---------------------------------------------------------------------------
drop policy if exists "users express interest as themselves on tasks they do not own" on public.task_interests;
create policy "users express interest as themselves on tasks they do not own"
  on public.task_interests for insert
  with check (
    initiated_by = 'helper'
    and auth.uid() = helper_id
    and not exists (
      select 1 from public.tasks
      where tasks.id = task_interests.task_id
        and tasks.created_by = auth.uid()
    )
    and not exists (
      select 1 from public.tasks t
      join public.blocks b on (
        (b.blocker_id = auth.uid() and b.blocked_id = t.created_by)
        or (b.blocker_id = t.created_by and b.blocked_id = auth.uid())
      )
      where t.id = task_interests.task_id
    )
  );

drop policy if exists "task owners can invite a candidate to their task" on public.task_interests;
create policy "task owners can invite a candidate to their task"
  on public.task_interests for insert
  with check (
    initiated_by = 'owner'
    and helper_id != auth.uid()
    and exists (
      select 1 from public.tasks
      where tasks.id = task_interests.task_id
        and tasks.created_by = auth.uid()
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = task_interests.helper_id)
         or (b.blocker_id = task_interests.helper_id and b.blocked_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Block enforcement on NEW messages rows.
-- Additive only: the existing INSERT policy (0004_messaging.sql) keeps both
-- of its current conditions, gaining one more AND clause. The SELECT policy
-- is untouched, so every existing message in a thread stays fully readable
-- by both participants even after either blocks the other -- only sending a
-- *new* message is prevented.
-- ---------------------------------------------------------------------------
drop policy if exists "participants send messages as themselves in their thread" on public.messages;
create policy "participants send messages as themselves in their thread"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.task_interests ti
      join public.tasks t on t.id = ti.task_id
      where ti.id = messages.task_interest_id
        and (ti.helper_id = auth.uid() or t.created_by = auth.uid())
    )
    and not exists (
      select 1
      from public.task_interests ti
      join public.tasks t on t.id = ti.task_id
      join public.blocks b on (
        (b.blocker_id = ti.helper_id and b.blocked_id = t.created_by)
        or (b.blocker_id = t.created_by and b.blocked_id = ti.helper_id)
      )
      where ti.id = messages.task_interest_id
    )
  );

-- ---------------------------------------------------------------------------
-- IMPORTANT MODERATION LIMIT: there is no admin/moderator dashboard yet.
-- Reports land in this table with status = 'open' and stay there. Nothing
-- in the app automatically reviews, actions, or notifies anyone about them.
-- A future moderation pass would need its own service-role/admin-only
-- access path (e.g. a Supabase service-role script, or a dedicated
-- `is_admin` claim/role checked in a new RLS policy) to read and update
-- report status -- none of that exists yet.
-- ---------------------------------------------------------------------------
