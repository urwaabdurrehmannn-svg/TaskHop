import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { useNotifications } from '../../context/NotificationContext';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { NOTIFICATION_TYPE_ICON } from '../../constants/notificationIcons';
import type { RootStackParamList } from '../../navigation/types';
import type { AppNotification } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function NotificationsScreen({ navigation }: Props) {
  const { notifications, unreadCount, loading, error, refreshNotifications, markAllAsRead, openNotification } =
    useNotifications();

  // read_at remains the source of truth in the database (nothing is ever
  // deleted) -- this just hides already-read notifications from this list,
  // so the visible feed always matches the unread badge.
  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.readAt), [notifications]);

  function handlePress(notification: AppNotification) {
    const destination = openNotification(notification);
    if (!destination) return;
    if (destination.screen === 'Conversation') {
      navigation.navigate('Conversation', destination.params);
    } else {
      navigation.navigate('TaskDetails', destination.params);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <Header
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightIcon={unreadCount > 0 ? 'checkmark-done' : undefined}
        onRightPress={markAllAsRead}
      />

      {loading ? (
        <LoadingIndicator label="Loading notifications…" />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load notifications"
          subtitle={error}
          actionLabel="Try again"
          onAction={refreshNotifications}
        />
      ) : unreadNotifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="You're all caught up"
          subtitle="Messages, interest, and updates on your tasks will show up here."
        />
      ) : (
        <FlatList
          data={unreadNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              style={({ pressed }) => [styles.card, !item.readAt && styles.cardUnread, pressed && styles.cardPressed]}
            >
              <View style={[styles.iconWrap, !item.readAt && styles.iconWrapUnread]}>
                <Ionicons
                  name={NOTIFICATION_TYPE_ICON[item.type]}
                  size={18}
                  color={item.readAt ? Colors.textTertiary : Colors.primary}
                />
              </View>
              <View style={styles.cardText}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.title, !item.readAt && styles.titleUnread]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.time}>{formatNotificationTime(item.createdAt)}</Text>
                </View>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
              {!item.readAt && <View style={styles.unreadDot} />}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  cardUnread: {
    borderColor: Colors.primaryMuted,
  },
  cardPressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: {
    backgroundColor: Colors.primaryLight,
  },
  cardText: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    ...Typography.bodySemibold,
    flexShrink: 1,
  },
  titleUnread: {
    color: Colors.textPrimary,
  },
  time: {
    ...Typography.caption,
    fontSize: 11,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginTop: 4,
  },
});

export default NotificationsScreen;
