import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';
import type { NotificationDestination } from '../utils/notificationNavigation';

/**
 * Lets code outside the navigation tree (the in-app notification banner,
 * which renders as a sibling of NavigationContainer, and the push
 * notification tap handler, which can fire before NavigationContainer even
 * mounts on a cold launch) trigger navigation without a `navigation` prop.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingDestination: NotificationDestination | null = null;

function performNavigate(destination: NotificationDestination) {
  if (destination.screen === 'Conversation') {
    navigationRef.navigate('Conversation', destination.params);
  } else {
    navigationRef.navigate('TaskDetails', destination.params);
  }
}

/**
 * Navigates to a notification's destination. If the NavigationContainer
 * isn't ready yet (e.g. the app was launched cold by tapping a push
 * notification), the destination is queued and replayed once
 * flushPendingNotificationNavigation() runs from onReady.
 */
export function navigateToNotification(destination: NotificationDestination) {
  if (navigationRef.isReady()) {
    performNavigate(destination);
  } else {
    pendingDestination = destination;
  }
}

/** Call from NavigationContainer's onReady prop. */
export function flushPendingNotificationNavigation() {
  if (pendingDestination && navigationRef.isReady()) {
    const destination = pendingDestination;
    pendingDestination = null;
    performNavigate(destination);
  }
}
