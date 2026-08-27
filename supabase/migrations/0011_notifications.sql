-- TaskHop: Notifications -- Phase 1, database foundation only.
--
-- This migration creates the notifications table and the device push token
-- table, plus their RLS policies and Realtime broadcast wiring. It
-- deliberately stops there: no triggers populate `notifications` yet (not
-- on new messages, accepted helpers, new interest, or task matching), no
-- Edge Function sends a push, and no client code writes to either table.
-- Both tables exist and are safe to query/subscribe against, but nothing
-- produces rows in them yet -- that's a follow-up phase.
--
-- Run once in the Supabase SQL Editor (or via `supabase db push`) after
-- 0010_reviews.sql.

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (
    type in ('new_message', 'interest_accepted', 'new_interest', 'new_task_match')
  ),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is
  'In-app + push notification feed, one row per event. recipient_id is only ever trusted via auth.uid() through RLS. No client-side INSERT/DELETE is permitted -- rows are created by future triggers/RPCs (service role or SECURITY DEFINER), not directly by the app. Phase 1: table + RLS + Realtime only, no producer wired up yet.';

comment on column public.notifications.data is
  'Deep-link payload, e.g. { "taskId": ..., "taskInterestId": ... } -- shape depends on type. App-defined, not constrained here.';

comment on column public.notifications.read_at is
  'Null until the recipient marks it read. The only column clients are granted UPDATE on (see grant below).';

-- Primary feed query: a user's notifications, newest first.
create index if not exists notifications_recipient_id_created_at_idx
  on public.notifications (recipient_id, created_at desc);

-- Unread-count / unread-list lookup. Partial so it stays small as read
-- notifications accumulate -- most rows end up read and drop out of this
-- index entirely.
create index if not exists notifications_recipient_id_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

-- Recipients can see only their own notifications.
create policy "users view their own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

-- Recipients can update only their own notifications (to mark them read).
-- The column grant below further restricts this to the read_at column
-- alone -- this policy authorizes the row, not which columns change.
create policy "users update their own notifications"
  on public.notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- Defense in depth: even though the policy above scopes UPDATE to the
-- recipient's own rows, the column grant stops that same policy from being
-- used to rewrite type/title/body/data/recipient_id -- only read_at is
-- writable by a client.
grant update (read_at) on public.notifications to authenticated;

-- No INSERT policy: without one, RLS denies all client-side inserts
-- outright, regardless of what the caller claims recipient_id is. Rows are
-- only ever created by a future trigger/RPC running with elevated
-- privilege (service role or SECURITY DEFINER) -- deliberately not built in
-- this migration.
--
-- No DELETE policy: notifications are never removed by the client in v1.

-- ---------------------------------------------------------------------------
-- device_push_tokens
-- ---------------------------------------------------------------------------
create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null,
  platform text,
  updated_at timestamptz not null default now(),
  unique (expo_push_token)
);

comment on table public.device_push_tokens is
  'Expo push tokens per device, used by a future send-push Edge Function to deliver notifications. expo_push_token is globally unique (not per-user) so a token that moves to a different account via reinstall/re-login is re-owned by the new user rather than duplicated. No trigger/function reads this yet -- Phase 1 only creates the table.';

create index if not exists device_push_tokens_user_id_idx
  on public.device_push_tokens (user_id);

alter table public.device_push_tokens enable row level security;

-- A user manages only their own device tokens -- full CRUD, since this is
-- purely the user's own device metadata, not shared or event-derived data
-- like notifications above.
create policy "users view their own device push tokens"
  on public.device_push_tokens for select
  using (auth.uid() = user_id);

create policy "users insert their own device push tokens"
  on public.device_push_tokens for insert
  with check (auth.uid() = user_id);

create policy "users update their own device push tokens"
  on public.device_push_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete their own device push tokens"
  on public.device_push_tokens for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Realtime: without this, INSERT/UPDATE events on notifications are never
-- broadcast, regardless of the RLS policies above (Realtime still respects
-- them for filtering who receives what -- this just turns broadcasting on
-- at all). Same pattern as messages (0004_messaging.sql). device_push_tokens
-- is deliberately not added -- it's device metadata, not something the
-- client needs to subscribe to in realtime.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- PHASE 1 SCOPE LIMIT: nothing populates public.notifications yet. No
-- trigger exists on messages/task_interests/tasks, accept_helper() (see
-- 0010_reviews.sql) is untouched, and no Edge Function sends a push using
-- device_push_tokens. Both tables are inert until a follow-up migration
-- adds the producers.
-- ---------------------------------------------------------------------------
