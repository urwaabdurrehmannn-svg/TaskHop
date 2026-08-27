// TaskHop: sends an Expo push notification for a row in public.notifications.
//
// Invoked by a Supabase Database Webhook (configured in the Dashboard --
// Database > Webhooks, NOT in a migration, since that would mean checking
// a secret into git) on INSERT to public.notifications. A webhook POSTs the
// full new row as { type: 'INSERT', table: 'notifications', record: {...} }.
// Also accepts a direct { notificationId } body, for manual/testing calls.
//
// Auth model: this function is called server-to-server by Supabase's own
// webhook infrastructure, not by the React Native client, so there is no
// end-user Supabase JWT to verify. It's deployed with --no-verify-jwt and
// instead checks a shared secret header (SEND_PUSH_WEBHOOK_SECRET) that the
// Database Webhook is configured to send -- see the deploy notes at the
// bottom for the exact manual setup.
//
// It uses the SERVICE ROLE key to read device_push_tokens/notifications for
// a user other than any caller -- Edge Functions get SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY automatically, no secret needs to be set for
// those two. That key is only ever used here, server-side, to build an
// admin client; it's never echoed back in any response.
//
// Deploy: supabase functions deploy send-push --no-verify-jwt
// Secret:  supabase secrets set SEND_PUSH_WEBHOOK_SECRET=<a-random-value>

import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface NotificationRow {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
}

interface WebhookPayload {
  type?: string;
  table?: string;
  record?: NotificationRow;
  notificationId?: unknown;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const webhookSecret = Deno.env.get('SEND_PUSH_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('SEND_PUSH_WEBHOOK_SECRET is not set as an Edge Function secret');
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }
  if (req.headers.get('x-webhook-secret') !== webhookSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not available to this function');
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  let body: WebhookPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  let notification: NotificationRow | null = body.record ?? null;

  if (!notification) {
    const notificationId = typeof body.notificationId === 'string' ? body.notificationId : null;
    if (!notificationId) {
      return jsonResponse({ error: 'notificationId or record is required' }, 400);
    }
    const { data, error } = await admin
      .from('notifications')
      .select('id, recipient_id, type, title, body, data')
      .eq('id', notificationId)
      .maybeSingle();
    if (error) {
      console.error('failed to load notification', error);
      return jsonResponse({ error: 'Could not load notification' }, 500);
    }
    notification = data;
  }

  if (!notification) {
    return jsonResponse({ error: 'Notification not found' }, 404);
  }

  const { data: tokenRows, error: tokenError } = await admin
    .from('device_push_tokens')
    .select('expo_push_token')
    .eq('user_id', notification.recipient_id);

  if (tokenError) {
    console.error('failed to load device tokens', tokenError);
    return jsonResponse({ error: 'Could not load device tokens' }, 500);
  }

  const tokens = (tokenRows ?? [])
    .map((r) => r.expo_push_token)
    .filter((t): t is string => typeof t === 'string' && t.startsWith('ExponentPushToken'));

  if (tokens.length === 0) {
    return jsonResponse({ skipped: true, reason: 'No registered device tokens for this recipient' });
  }

  const messages = tokens.map((token) => ({
    to: token,
    title: notification!.title,
    body: notification!.body,
    sound: 'default',
    data: {
      notificationId: notification!.id,
      type: notification!.type,
      ...(notification!.data ?? {}),
    },
  }));

  try {
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await expoResponse.json();

    if (!expoResponse.ok) {
      console.error('Expo push API returned an error', result);
      return jsonResponse({ error: 'Expo push API error', details: result }, 502);
    }

    // Expo returns one ticket per message, in the same order. A
    // DeviceNotRegistered error means that token is dead (app uninstalled,
    // etc.) and should stop being used -- prune it so future sends don't
    // keep paying for a dead delivery attempt.
    const tickets: ExpoTicket[] = Array.isArray(result?.data) ? result.data : [];
    const staleTokens = tokens.filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered');
    if (staleTokens.length > 0) {
      const { error: pruneError } = await admin.from('device_push_tokens').delete().in('expo_push_token', staleTokens);
      if (pruneError) {
        console.error('failed to prune stale device tokens', pruneError);
      }
    }

    return jsonResponse({ sent: tokens.length, staleRemoved: staleTokens.length, tickets });
  } catch (err) {
    console.error('send-push failed to reach Expo push API', err);
    return jsonResponse({ error: 'Failed to send push notification' }, 502);
  }
});
