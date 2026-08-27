-- TaskHop: owner-initiated invites on task_interests.
-- Lets a task owner invite a specific matched candidate from the Matches
-- screen, alongside the existing helper-initiated "I can help with this"
-- flow on TaskDetailsScreen. Reuses the same table (not a new one) so
-- messaging keeps working unchanged -- it already treats a task_interests
-- row as the thread identity regardless of who created it. Run once in the
-- Supabase SQL Editor (or via `supabase db push`) after 0005_task_exchange.sql.

alter table public.task_interests
  add column if not exists initiated_by text not null default 'helper'
    check (initiated_by in ('helper', 'owner'));

comment on column public.task_interests.initiated_by is
  'Who created this connection: the helper opting in themselves, or the task owner inviting a matched candidate. helper_id always means the non-owner participant either way.';

-- ---------------------------------------------------------------------------
-- RLS: add the owner-invite path; tighten the existing helper path so it
-- can''t be used to forge an owner-initiated row.
-- ---------------------------------------------------------------------------

-- Task owners can invite a specific candidate to their own task.
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
  );

-- Tightened: the existing helper-initiated policy now also requires the row
-- to be honestly tagged 'helper', so a helper can't insert a row falsely
-- claiming to be an owner invite.
drop policy "users express interest as themselves on tasks they do not own" on public.task_interests;
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
  );

-- SELECT and DELETE policies are intentionally unchanged: SELECT already
-- covers both parties via helper_id/created_by regardless of initiator, and
-- withdrawal remains helper-only, same as before this migration.
