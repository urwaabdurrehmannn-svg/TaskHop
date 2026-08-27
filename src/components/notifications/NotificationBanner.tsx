import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { NOTIFICATION_TYPE_ICON } from '../../constants/notificationIcons';
import { useNotifications } from '../../context/NotificationContext';
import { navigateToNotification } from '../../navigation/navigationRef';

const AUTO_DISMISS_MS = 4000;

/**
 * Transient top-of-screen banner for a notification that arrives while the
 * app is open. Rendered once, as a sibling of NavigationContainer (see
 * App.tsx), so it overlays whatever screen is currently visible. Driven by
 * NotificationContext's Realtime subscription, not by push -- this is why
 * the push notification handler (usePushNotifications) suppresses the OS
 * banner while foregrounded, to avoid showing both for the same event.
 */
export function NotificationBanner() {
  const insets = useSafeAreaInsets();
  const { bannerNotification, dismissBanner, openNotification } = useNotifications();

  useEffect(() => {
    if (!bannerNotification) return;
    const timer = setTimeout(dismissBanner, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [bannerNotification, dismissBanner]);

  if (!bannerNotification) return null;

  function handlePress() {
    if (!bannerNotification) return;
    const destination = openNotification(bannerNotification);
    dismissBanner();
    if (destination) navigateToNotification(destination);
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + Spacing.xs }]}>
      <Pressable onPress={handlePress} style={[styles.banner, Shadow.lg]}>
        <View style={styles.iconWrap}>
          <Ionicons name={NOTIFICATION_TYPE_ICON[bannerNotification.type]} size={18} color={Colors.primary} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {bannerNotification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {bannerNotification.body}
          </Text>
        </View>
        <Pressable onPress={dismissBanner} hitSlop={8} style={styles.closeButton}>
          <Ionicons name="close" size={16} color={Colors.textTertiary} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 999,
    elevation: 999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    ...Typography.bodySemibold,
  },
  body: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 2,
  },
});

export default NotificationBanner;
