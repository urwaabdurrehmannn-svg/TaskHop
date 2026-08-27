import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { NotificationType } from '../types';

/** Shared between NotificationsScreen and the in-app banner so an event always reads the same icon everywhere. */
export const NOTIFICATION_TYPE_ICON: Record<NotificationType, ComponentProps<typeof Ionicons>['name']> = {
  new_message: 'chatbubble-ellipses-outline',
  interest_accepted: 'checkmark-circle-outline',
  new_interest: 'hand-left-outline',
  new_task_match: 'sparkles-outline',
};
