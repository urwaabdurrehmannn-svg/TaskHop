-- TaskHop: Notifications -- Phase 2, producers for existing events.
--
-- Populates public.notifications (0011_notifications.sql) for three events
-- that already happen today: a new message, a helper expressing interest,
-- and a task owner accepting a helper. Implemented at the database level
-- (triggers + one RPC change) rather than in client code, so a notification
-- can't be skipped just because a particular screen/service call changes or
-- is bypassed by a future client.
--
-- Still NOT implemented here (unchanged from 0011's scope limit): Expo push
-- delivery, device_push_tokens usage, any notification UI/context, and new
-- task/opportunity matching (type 'new_task_match' remains unused).
--
-- Run once in the Supabase SQL Editor (or via `supabase db push`) after
-- 0011_notifications.sql.

-- ---------------------------------------------------------------------------
-- Why SECURITY DEFINER shows up below, and why that's still safe:
--
-- notifications (0011) intentionally has no INSERT policy at all -- RLS
-- denies every client-side insert, regardless of role. A trigger function
-- that runs as SECURITY INVOKER (the default) executes with the triggering
-- user's own privileges, so it would hit that same RLS wall and fail to
-- write the very notification it's supposed to create for the *other*
-- participant. SECURITY DEFINER is the standard, narrowly-scoped fix for
-- exactly this shape of problem -- it's the same reason
-- public.handle_new_user() (0001_init.sql) is SECURITY DEFINER: inserting a
-- row that legitimately belongs to someone other than the acting user.
--
-- The two trigger functions below (notify_on_new_message,
-- notify_on_new_interest) are safe to make SECURITY DEFINER because:
--   1. Postgres refuses to let a `returns trigger` function be invoked any
--      way other than as an actual trigger -- there is no RPC/direct-call
--      surface to grant or revoke here.
--   2. Each one only ever inserts into public.notifications, using data
--      read from the very row that just passed the triggering table's own
--      INSERT RLS check (messages / task_interests), not caller-supplied
--      identity.
--
-- accept_helper() is different: it's a plain `returns void` function
-- callable directly via supabase.rpc(), and 0010_reviews.sql deliberately
-- kept it SECURITY INVOKER so the accept/reassign UPDATEs stay governed by
-- real RLS, not a bypass. Making the whole function SECURITY DEFINER just to
-- unlock one notification insert would silently bypass RLS on those UPDATEs
-- too -- exactly what 0010 avoided. Instead, accept_helper stays SECURITY
-- INVOKER and calls a new, single-purpose SECURITY DEFINER function,
-- notify_interest_accepted(), which re-derives its own authorization from
-- the database (task ownership + accepted = true) instead of trusting its
-- arguments. That makes it safe to grant EXECUTE to `authenticated`
-- directly: a caller who isn't genuinely the task's owner, or who names a
-- task_interest that isn't actually the accepted one, gets a silent no-op,
-- never an arbitrary notification to an arbitrary recipient.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. New message -> notify the other participant, never the sender.
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_id uuid;
  v_helper_id uuid;
  v_owner_id uuid;
  v_recipient_id uuid;
  v_sender_name text;
begin
  select ti.task_id, ti.helper_id, t.created_by
    into v_task_id, v_helper_id, v_owner_id
  from public.task_interests ti
  join public.tasks t on t.id = ti.task_id
  where ti.id = new.task_interest_id;

  if v_task_id is null then
    return new;
  end if;

  v_recipient_id := case when new.sender_id = v_helper_id then v_owner_id else v_helper_id end;

  select name into v_sender_name from public.profiles where id = new.sender_id;

  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    v_recipient_id,
    'new_message',
    coalesce('New message from ' || v_sender_name, 'New message'),
    left(new.body, 140),
    jsonb_build_object(
      'taskInterestId', new.task_interest_id,
      'taskId', v_task_id,
      'messageId', new.id,
      'senderId', new.sender_id
    )
  );

  return new;
end;
$$;

drop trigger if exists on_message_created_notify on public.messages;
create trigger on_message_created_notify
  after insert on public.messages
  for each row execute function public.notify_on_new_message();

-- ---------------------------------------------------------------------------
-- 2. New task interest -> notify the task owner.
-- Only fires for a helper actively expressing interest (initiated_by =
-- 'helper'); an owner-initiated invite is the owner's own action and must
-- not notify them about themselves.
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_new_interest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_task_title text;
  v_helper_name text;
begin
  if new.initiated_by != 'helper' then
    return new;
  end if;

  select t.created_by, t.title into v_owner_id, v_task_title
  from public.tasks t
  where t.id = new.task_id;

  -- Defensive: RLS already prevents a helper from expressing interest in
  -- their own task, but this must never notify an owner about themselves
  -- regardless of how the row was created.
  if v_owner_id is null or v_owner_id = new.helper_id then
    return new;
  end if;

  select name into v_helper_name from public.profiles where id = new.helper_id;

  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    v_owner_id,
    'new_interest',
    'New interest in your task',
    coalesce(
      v_helper_name || ' is interested in helping with "' || v_task_title || '".',
      'Someone is interested in helping with your task.'
    ),
    jsonb_build_object('taskId', new.task_id, 'taskInterestId', new.id)
  );

  return new;
end;
$$;

drop trigger if exists on_task_interest_created_notify on public.task_interests;
create trigger on_task_interest_created_notify
  after insert on public.task_interests
  for each row execute function public.notify_on_new_interest();

-- ---------------------------------------------------------------------------
-- 3. Accepted helper -> notify the accepted helper, atomically with the
-- acceptance itself (see the SECURITY note above for why this is a separate
-- function rather than an inline insert or a SECURITY DEFINER accept_helper).
-- ---------------------------------------------------------------------------
create or replace function public.notify_interest_accepted(p_task_id uuid, p_task_interest_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_helper_id uuid;
  v_task_title text;
begin
  -- Re-derives authorization from the database instead of trusting the
  -- arguments: only matches if the caller (auth.uid()) genuinely owns
  -- p_task_id, and p_task_interest_id is genuinely the currently-accepted
  -- interest on that task. Anything else is a silent no-op.
  select ti.helper_id, t.title
    into v_helper_id, v_task_title
  from public.task_interests ti
  join public.tasks t on t.id = ti.task_id
  where ti.id = p_task_interest_id
    and ti.task_id = p_task_id
    and ti.accepted = true
    and t.created_by = auth.uid();

  if v_helper_id is null then
    return;
  end if;

  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    v_helper_id,
    'interest_accepted',
    'You''ve been accepted!',
    'You were accepted to help with "' || v_task_title || '".',
    jsonb_build_object('taskId', p_task_id, 'taskInterestId', p_task_interest_id)
  );
end;
$$;

revoke all on function public.notify_interest_accepted(uuid, uuid) from public;
grant execute on function public.notify_interest_accepted(uuid, uuid) to authenticated;

-- Full redefinition of accept_helper() from 0010_reviews.sql: identical
-- accept/reassign body (still SECURITY INVOKER, still the same zero-rows-
-- affected check and rollback behavior), with exactly one addition -- the
-- notify_interest_accepted() call as the last statement, once the accept is
-- confirmed to have actually happened. Because this all runs inside a
-- single function invocation/transaction, an exception anywhere above this
-- call (e.g. the zero-rows case) rolls back before the notification is ever
-- inserted, and any hypothetical failure after it would roll back the
-- notification along with the acceptance -- there is no path where one
-- commits without the other.
create or replace function public.accept_helper(p_task_id uuid, p_task_interest_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated_count integer;
begin
  update public.task_interests
    set accepted = false
    where task_id = p_task_id
      and accepted = true;

  update public.task_interests
    set accepted = true
    where id = p_task_interest_id
      and task_id = p_task_id;

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'This helper can no longer be accepted for this task.';
  end if;

  perform public.notify_interest_accepted(p_task_id, p_task_interest_id);
end;
$$;

revoke all on function public.accept_helper(uuid, uuid) from public;
grant execute on function public.accept_helper(uuid, uuid) to authenticated;
