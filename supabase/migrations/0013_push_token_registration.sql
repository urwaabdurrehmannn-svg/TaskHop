-- TaskHop: Push notifications -- device token registration RPC.
--
-- device_push_tokens (0011_notifications.sql) already has RLS letting a
-- user manage their own rows, and expo_push_token is globally unique so a
-- token can't be attached to two users at once. That uniqueness creates one
-- gap a plain client-side upsert can't cross: when a device is reinstalled
-- or a different account signs in on the same device, the token already
-- belongs to a DIFFERENT user's row. RLS's UPDATE policy checks ownership
-- against auth.uid() = user_id on the EXISTING row, so a plain
-- `.upsert(..., { onConflict: 'expo_push_token' })` from the new user would
-- be rejected outright -- there is no client-side way to "steal" a token
-- back, by design.
--
-- register_device_push_token() is the narrow, self-authorizing fix: it may
-- delete a token row belonging to someone else, but ONLY the exact token
-- value the caller is actively registering (their own device's token,
-- obtained from Notifications.getExpoPushTokenAsync() on their own device)
-- -- never an arbitrary row chosen by the caller. It then attaches that
-- same token to auth.uid(). Same pattern as notify_interest_accepted()
-- (0012_notification_producers.sql): SECURITY DEFINER, but the privilege
-- it grants is scoped to data the caller already legitimately possesses.
--
-- Run once in the Supabase SQL Editor (or via `supabase db push`) after
-- 0012_notification_producers.sql.

create or replace function public.register_device_push_token(p_expo_push_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_expo_push_token is null or length(trim(p_expo_push_token)) = 0 then
    raise exception 'p_expo_push_token is required';
  end if;

  -- Re-owns the token if it was previously registered to a different user
  -- (reinstall / different account on the same device). Scoped to this
  -- exact token value only.
  delete from public.device_push_tokens
  where expo_push_token = p_expo_push_token
    and user_id != auth.uid();

  insert into public.device_push_tokens (user_id, expo_push_token, platform, updated_at)
  values (auth.uid(), p_expo_push_token, p_platform, now())
  on conflict (expo_push_token)
  do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    updated_at = now();
end;
$$;

revoke all on function public.register_device_push_token(text, text) from public;
grant execute on function public.register_device_push_token(text, text) to authenticated;

comment on function public.register_device_push_token(text, text) is
  'Client entry point for push-token registration -- see notificationService/pushTokenService in the app. Handles the reinstall/account-switch case that a plain RLS-scoped upsert cannot (see comment above). Sign-out cleanup uses a plain client-side DELETE (already permitted by 0011''s RLS), not this function.';
