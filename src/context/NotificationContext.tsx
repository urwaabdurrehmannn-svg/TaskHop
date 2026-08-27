import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppNotification } from '../types';
import * as notificationService from '../services/notifications/notificationService';
import { useAuth } from './AuthContext';
import { resolveNotificationDestination } from '../utils/notificationNavigation';
import type { NotificationDestination } from '../utils/notificationNavigation';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  /** Marks every unread new_message notification for one conversation as read (e.g. on opening that thread). */
  markConversationAsRead: (taskInterestId: string) => Promise<void>;
  /**
   * Single entry point for "the user opened this notification" (list tap,
   * banner tap): applies the right read-state update for its type, and
   * returns where it should navigate to (or null).
   */
  openNotification: (notification: AppNotification) => NotificationDestination | null;
  /** Most recent notification to show as a transient in-app banner, or null once dismissed/expired. */
  bannerNotification: AppNotification | null;
  dismissBanner: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerNotification, setBannerNotification] = useState<AppNotification | null>(null);

  // Tracks every notification id this session has already surfaced (via
  // initial fetch or Realtime), so a Realtime echo of a row we already know
  // about never pops a second banner for the same event.
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  const refreshNotifications = useCallback(async () => {
    if (!session) {
      setNotifications([]);
      return;
    }
    try {
      setError(null);
      const fetched = await notificationService.fetchNotifications(session.user.id);
      fetched.forEach((n) => seenNotificationIdsRef.current.add(n.id));
      setNotifications(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      setLoading(true);
      refreshNotifications();
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [session, refreshNotifications]);

  // Realtime keeps the list current without a manual refresh (e.g. a new
  // message notification appearing while the app is open elsewhere) --
  // same pattern as messageService.subscribeToNewMessages.
  useEffect(() => {
    if (!session) return;
    const unsubscribe = notificationService.subscribeToNewNotifications(session.user.id, (incoming) => {
      if (seenNotificationIdsRef.current.has(incoming.id)) return;
      seenNotificationIdsRef.current.add(incoming.id);
      setNotifications((prev) => [incoming, ...prev]);
      setBannerNotification(incoming);
    });
    return unsubscribe;
  }, [session?.user.id]);

  const dismissBanner = useCallback(() => setBannerNotification(null), []);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n))
    );
    await notificationService.markAsRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!session) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    await notificationService.markAllAsRead(session.user.id);
  }, [session]);

  const markConversationAsRead = useCallback(
    async (taskInterestId: string) => {
      if (!session) return;
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) =>
          n.type === 'new_message' && n.data.taskInterestId === taskInterestId && !n.readAt
            ? { ...n, readAt: now }
            : n
        )
      );
      await notificationService.markConversationMessageNotificationsAsRead(session.user.id, taskInterestId);
    },
    [session]
  );

  const openNotification = useCallback(
    (notification: AppNotification): NotificationDestination | null => {
      if (notification.type === 'new_message' && notification.data.taskInterestId) {
        markConversationAsRead(notification.data.taskInterestId);
      } else if (!notification.readAt) {
        markAsRead(notification.id);
      }
      return resolveNotificationDestination({
        type: notification.type,
        taskId: notification.data.taskId,
        taskInterestId: notification.data.taskInterestId,
      });
    },
    [markAsRead, markConversationAsRead]
  );

  const unreadCount = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      markConversationAsRead,
      openNotification,
      bannerNotification,
      dismissBanner,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      markConversationAsRead,
      openNotification,
      bannerNotification,
      dismissBanner,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
