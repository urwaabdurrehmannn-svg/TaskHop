import type { NotificationType } from '../types';

const NOTIFICATION_TYPES: readonly NotificationType[] = [
  'new_message',
  'interest_accepted',
  'new_interest',
  'new_task_match',
];

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

/** Where tapping a notification (list row, in-app banner, or push tap) should navigate to. */
export type NotificationDestination =
  | { screen: 'Conversation'; params: { taskInterestId: string } }
  | { screen: 'TaskDetails'; params: { taskId: string } };

export interface NotificationDestinationInput {
  type: NotificationType;
  taskId?: string;
  taskInterestId?: string;
}

/**
 * Single source of truth for notification deep-linking, shared by
 * NotificationsScreen, the in-app banner, and the push notification tap
 * handler so all three entry points always agree on where a given
 * notification leads.
 */
export function resolveNotificationDestination(input: NotificationDestinationInput): NotificationDestination | null {
  switch (input.type) {
    case 'new_message':
      return input.taskInterestId ? { screen: 'Conversation', params: { taskInterestId: input.taskInterestId } } : null;
    case 'interest_accepted':
      if (input.taskInterestId) return { screen: 'Conversation', params: { taskInterestId: input.taskInterestId } };
      if (input.taskId) return { screen: 'TaskDetails', params: { taskId: input.taskId } };
      return null;
    case 'new_interest':
    case 'new_task_match':
      return input.taskId ? { screen: 'TaskDetails', params: { taskId: input.taskId } } : null;
    default:
      return null;
  }
}
