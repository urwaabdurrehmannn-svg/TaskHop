import { supabase } from '../../lib/supabase';
import type { AppNotification, NotificationData, NotificationType } from '../../types';

interface NotificationRow {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: (row.data ?? {}) as NotificationData,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/** The current user's notifications, newest first. */
export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/**
 * Marks a single notification read. RLS scopes this to the caller's own
 * notifications, and the table additionally grants UPDATE on read_at only
 * (see 0011_notifications.sql) -- this can never touch type/title/body/data.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) throw error;
}

/** Marks every currently-unread notification for this user as read. */
export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null);
  if (error) throw error;
}

/**
 * Marks every unread new_message notification for one conversation as read
 * -- opening a thread should clear every unread "new message" notification
 * for that thread, not just the one that was tapped. Scoped to
 * type = 'new_message' so other notification types (e.g. interest_accepted,
 * which can also carry a taskInterestId) are never touched by this call.
 */
export async function markConversationMessageNotificationsAsRead(
  userId: string,
  taskInterestId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .eq('type', 'new_message')
    .eq('data->>taskInterestId', taskInterestId)
    .is('read_at', null);
  if (error) throw error;
}

/** Subscribes to new notifications for this user; returns an unsubscribe function for effect cleanup. */
export function subscribeToNewNotifications(
  userId: string,
  onInsert: (notification: AppNotification) => void
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on<NotificationRow>(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
      (payload) => {
        console.log('NOTIFICATION INSERT RECEIVED:', payload.new);
        onInsert(mapRow(payload.new));
      }
    )
    // TEMPORARY diagnostic: confirms whether this channel actually reaches
    // SUBSCRIBED (vs CHANNEL_ERROR/TIMED_OUT/CLOSED) -- remove once the
    // Realtime delivery issue is confirmed fixed.
    .subscribe((status, err) => {
      console.log('notifications channel status:', status, err ?? '');
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
