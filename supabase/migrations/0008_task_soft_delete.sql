-- TaskHop: soft "permanent" deletion for tasks.
-- Adds a nullable deleted_at timestamp to tasks. Setting it is how a task
-- owner "permanently deletes" a cancelled task from every discovery/list
-- surface -- it is NEVER a real DELETE, so task_skills/task_interests/
-- messages (all FK'd to tasks via ON DELETE CASCADE) are never touched,
-- and existing interest/conversation history stays fully intact.
--
-- No RLS change: the existing "users update their own tasks" policy
-- (0001_init.sql) already applies to updates on any column of a task the
-- caller owns (it has no column-level restriction), which is exactly the
-- protection "only the owner can permanently delete their own task" needs.
--
-- Run once in the Supabase SQL Editor (or via `supabase db push`) after
-- 0007_task_cancel_status.sql.

alter table public.tasks
  add column if not exists deleted_at timestamptz;

comment on column public.tasks.deleted_at is
  'Set when the task owner permanently deletes a cancelled task. The row (and its task_skills/task_interests/messages) is never actually removed -- this only hides it from every discovery/list surface. NULL means not deleted.';

create index if not exists tasks_deleted_at_idx on public.tasks (deleted_at);
