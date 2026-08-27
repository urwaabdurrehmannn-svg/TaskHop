-- TaskHop: messaging between a task owner and an interested helper.
-- Thread identity is the existing task_interests row -- deliberately no
-- separate "conversations" table, since a task_interest already uniquely
-- identifies exactly one (task, helper) pair. Run once in the Supabase SQL
-- Editor (or via `supabase db push`) after 0003.

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  task_interest_id uuid not null references public.task_interests (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists messages_task_interest_id_created_at_idx
  on public.messages (task_interest_id, created_at);

comment on table public.messages is
  'Chat messages within a task_interest thread. The only two participants are the interested helper and the task owner.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Same participant check used by task_interests itself: you're either the
-- helper on that interest, or you own the task the interest is on.
-- ---------------------------------------------------------------------------
alter table public.messages enable row level security;

create policy "participants can read messages in their thread"
  on public.messages for select
  using (
    exists (
      select 1
      from public.task_interests ti
      join public.tasks t on t.id = ti.task_id
      where ti.id = messages.task_interest_id
        and (ti.helper_id = auth.uid() or t.created_by = auth.uid())
    )
  );

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
  );

-- No update/delete policy: no edit/delete-message feature exists yet, so no
-- role can modify or remove a message once sent.

-- ---------------------------------------------------------------------------
-- Realtime: without this, INSERT events on this table are never broadcast,
-- regardless of the RLS policies above (Realtime still respects them for
-- filtering who receives what -- this just turns broadcasting on at all).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
