export * from './user';
export * from './task';

import type { User } from './user';

export interface MatchReason {
  id: string;
  label: string;
}

export interface Match {
  id: string;
  taskId: string;
  user: User;
  score: number;
  reasons: MatchReason[];
}

/** Who created a connection: the helper opting in themselves, or the task owner inviting a matched candidate. */
export type InterestInitiator = 'helper' | 'owner';

/** A connection between a task and a helper -- either the helper expressed interest, or the task owner invited them. */
export interface TaskInterest {
  id: string;
  taskId: string;
  helper: User;
  initiatedBy: InterestInitiator;
  /** True once the task owner has marked this as the one connection they actually worked with. Drives review eligibility. */
  accepted: boolean;
  createdAt: string;
}

export type NotificationType = 'new_message' | 'interest_accepted' | 'new_interest' | 'new_task_match';

/**
 * Deep-link payload for a notification. Shape depends on `type` -- not
 * every field is present for every notification, since the producers
 * (see supabase/migrations/0012_notification_producers.sql) populate only
 * what's relevant to that event.
 */
export interface NotificationData {
  taskId?: string;
  taskInterestId?: string;
  messageId?: string;
  senderId?: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  readAt: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  taskInterestId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

/** A message thread, identified by its underlying task_interest. Not a separate DB entity. */
export interface Conversation {
  taskInterestId: string;
  taskId: string;
  taskTitle: string;
  otherUser: User;
  lastMessage: ChatMessage | null;
  isUnread: boolean;
}
