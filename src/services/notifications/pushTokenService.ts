import { supabase } from '../../lib/supabase';

/**
 * Registers (or re-owns) this device's Expo push token for the currently
 * authenticated user. Goes through the register_device_push_token() RPC
 * (0013_push_token_registration.sql) rather than a plain upsert, because a
 * plain client-side upsert can't cross accounts: expo_push_token is
 * globally unique, and RLS's UPDATE policy only lets a user touch a row
 * they already own -- if this device previously belonged to a different
 * account, a raw upsert would be rejected outright.
 */
export async function registerDeviceToken(expoPushToken: string, platform: string): Promise<void> {
  const { error } = await supabase.rpc('register_device_push_token', {
    p_expo_push_token: expoPushToken,
    p_platform: platform,
  });
  if (error) throw error;
}

/**
 * Removes this device's token on sign-out (or when it's no longer needed),
 * so a signed-out device stops being a valid delivery target for the
 * account that just signed out. Plain RLS-scoped delete is sufficient here
 * -- no cross-account case to handle, unlike registration.
 */
export async function deletePushToken(expoPushToken: string): Promise<void> {
  const { error } = await supabase.from('device_push_tokens').delete().eq('expo_push_token', expoPushToken);
  if (error) throw error;
}
