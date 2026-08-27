import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { Avatar, AvatarSize } from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import * as messageService from '../../services/messages/messageService';
import { Colors } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import type { Conversation } from '../../types';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Messages'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function formatConversationTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function MessagesScreen() {
  const navigation = useNavigation<NavProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const { session } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!session) return;
    try {
      setError(null);
      const result = await messageService.fetchConversations(session.user.id);
      setConversations(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your conversations.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Refresh whenever the tab regains focus (e.g. returning from a conversation
  // you just sent a message in) -- no Realtime subscription for the list itself,
  // only for an open thread.
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  return (
    <ScreenContainer contentStyle={[styles.content, { paddingBottom: tabBarHeight + Spacing.xl }]}>
      <ScreenHeader title="Messages" subtitle="Conversations with people you've connected with." />

      {loading ? (
        <LoadingIndicator label="Loading conversations…" />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load messages"
          subtitle={error}
          actionLabel="Try again"
          onAction={loadConversations}
        />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No conversations yet"
          subtitle="When you connect with a match, your conversation will show up here."
          actionLabel="Explore tasks"
          onAction={() => navigation.navigate('Home')}
        />
      ) : (
        <View>
          {conversations.map((conversation) => (
            <Pressable
              key={conversation.taskInterestId}
              onPress={() => navigation.navigate('Conversation', { taskInterestId: conversation.taskInterestId })}
              style={({ pressed }) => [styles.card, Shadow.sm, pressed && styles.cardPressed]}
            >
              <Avatar
                name={conversation.otherUser.name}
                initials={conversation.otherUser.initials}
                color={conversation.otherUser.avatarColor}
                imageUrl={conversation.otherUser.avatarUrl}
                size={AvatarSize.md}
              />
              <View style={styles.cardText}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {conversation.otherUser.name}
                  </Text>
                  {conversation.lastMessage && (
                    <Text style={styles.time}>{formatConversationTime(conversation.lastMessage.createdAt)}</Text>
                  )}
                </View>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {conversation.taskTitle}
                </Text>
                <Text
                  style={[styles.preview, conversation.isUnread && styles.previewUnread]}
                  numberOfLines={1}
                >
                  {conversation.lastMessage ? conversation.lastMessage.body : 'Say hello to get started.'}
                </Text>
              </View>
              {conversation.isUnread && <View style={styles.unreadDot} />}
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  cardPressed: {
    opacity: 0.9,
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
  name: {
    ...Typography.bodySemibold,
    flexShrink: 1,
  },
  time: {
    ...Typography.caption,
    fontSize: 11,
  },
  taskTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  preview: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previewUnread: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
});

export default MessagesScreen;
