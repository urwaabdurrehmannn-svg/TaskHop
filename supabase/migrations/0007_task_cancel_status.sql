-- TaskHop: allow a task owner to cancel a task.
-- Adds 'cancelled' to the existing tasks.status check constraint. No new
-- column, no RLS change -- the existing "users update their own tasks"
-- policy (0001_init.sql) already restricts who can change a task's status
-- to that task's owner, which is exactly the protection Cancel/Complete
-- need. Cancelling/completing only ever changes this one column; the task
-- row, its task_skills, task_interests, and messages are all left intact
-- (never hard-deleted), so existing connections and conversation history
-- stay fully readable. Run once in the Supabase SQL Editor (or via
-- `supabase db push`) after 0006_owner_invite.sql.

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('open', 'matching', 'in_progress', 'completed', 'cancelled'));

-- Note: 'tasks_status_check' is Postgres's default auto-generated name for
-- an unnamed inline `check (...)` on the `status` column (as originally
-- defined in 0001_init.sql). If your project's constraint ended up with a
-- different name, find it first with:
--   select conname from pg_constraint where conrelid = 'public.tasks'::regclass and contype = 'c';
-- and substitute that name into the `drop constraint` line above.
