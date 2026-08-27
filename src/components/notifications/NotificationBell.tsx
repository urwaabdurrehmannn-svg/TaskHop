import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/spacing';
import { useNotifications } from '../../context/NotificationContext';

interface NotificationBellProps {
  onPress: () => void;
  size?: number;
}

/** Small reusable bell + unread-count badge, meant for a screen header's action row. */
export function NotificationBell({ onPress, size = 22 }: NotificationBellProps) {
  const { unreadCount } = useNotifications();

  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.wrap} accessibilityRole="button">
      <Ionicons name="notifications-outline" size={size} color={Colors.textPrimary} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: Radius.full,
    paddingHorizontal: 3,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textInverse,
  },
});

export default NotificationBell;
