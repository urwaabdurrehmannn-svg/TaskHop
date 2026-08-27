import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import * as pushTokenService from '../services/notifications/pushTokenService';
import { navigateToNotification } from '../navigation/navigationRef';
import { isNotificationType, resolveNotificationDestination } from '../utils/notificationNavigation';

// While the app is foregrounded, our own NotificationBanner (driven by the
// notifications table's Realtime feed -- see NotificationContext) is
// already showing the event. Returning all-false here stops the OS from
// ALSO presenting a system banner/sound/badge for the same push at the same
// time. This has no effect on background/killed-app delivery -- the OS
// renders those natively, before any JS in this app ever runs.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function getExpoPushTokenSafely(): Promise<string | null> {
  // Physical devices only: simulators/emulators can't receive real push,
  // and Expo Go on Android has had remote push removed since SDK 53 --
  // calling getExpoPushTokenAsync there either throws or returns a token
  // nothing can ever deliver to. Never let push registration crash the app.
  if (!Device.isDevice) return null;

  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return null;

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (err) {
    console.log('Push token registration skipped:', err instanceof Error ? err.message : err);
    return null;
  }
}

function extractString(data: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = data?.[key];
  return typeof value === 'string' ? value : undefined;
}

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const type = data?.type;
  if (!isNotificationType(type)) return;

  const destination = resolveNotificationDestination({
    type,
    taskId: extractString(data, 'taskId'),
    taskInterestId: extractString(data, 'taskInterestId'),
  });
  if (destination) navigateToNotification(destination);
}

/**
 * Registers this device's push token while a user is signed in, tears it
 * down on sign-out/account-change, and wires notification taps (both a live
 * tap and a cold-start launch-from-notification) to in-app navigation.
 * Mount once, near the app root -- see App.tsx.
 */
export function usePushNotifications() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let registeredToken: string | null = null;

    (async () => {
      const token = await getExpoPushTokenSafely();
      if (!token || cancelled) return;
      registeredToken = token;
      try {
        await pushTokenService.registerDeviceToken(token, Platform.OS);
      } catch (err) {
        console.log('Could not register push token:', err instanceof Error ? err.message : err);
      }
    })();

    return () => {
      cancelled = true;
      // Best-effort: stops this device from being a valid push target for
      // the account that just signed out (or is about to be replaced by a
      // different account on the same device). Not awaited -- sign-out UX
      // shouldn't wait on a network call.
      if (registeredToken) {
        pushTokenService.deletePushToken(registeredToken).catch(() => {});
      }
    };
  }, [session?.user.id]);

  useEffect(() => {
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) handleNotificationResponse(lastResponse);

    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => subscription.remove();
  }, []);
}
