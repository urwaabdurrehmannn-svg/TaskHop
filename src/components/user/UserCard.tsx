import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar, AvatarSize } from '../common/Avatar';
import { SkillTag } from '../common/SkillTag';
import type { User } from '../../types';

interface UserCardProps {
  user: User;
  onPress?: () => void;
  compact?: boolean;
  onMoreOptions?: (userId: string, userName: string) => void;
}

export function UserCard({ user, onPress, compact = false, onMoreOptions }: UserCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        Shadow.sm,
        compact && styles.cardCompact,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <Avatar
          name={user.name}
          initials={user.initials}
          color={user.avatarColor}
          imageUrl={user.avatarUrl}
          size={AvatarSize.md}
          availability={user.availability}
        />
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={Colors.warning} />
            <Text style={styles.ratingText}>
              {user.stats.avgRating.toFixed(1)} · {user.stats.tasksCompleted} tasks
            </Text>
          </View>
        </View>
        {onMoreOptions && (
          <Pressable
            onPress={() => onMoreOptions(user.id, user.name)}
            hitSlop={8}
            style={styles.moreButton}
            accessibilityLabel={`More options for ${user.name}`}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {!compact && (
        <Text style={styles.bio} numberOfLines={2}>
          {user.bio}
        </Text>
      )}

      <View style={styles.skillsRow}>
        {user.skills.slice(0, compact ? 2 : 3).map((s) => (
          <SkillTag key={s.id} label={s.name} size="sm" />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardCompact: {
    width: 220,
  },
  pressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  headerText: {
    marginLeft: Spacing.xs,
    flex: 1,
  },
  name: {
    ...Typography.bodySemibold,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    ...Typography.caption,
  },
  moreButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bio: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export default UserCard;
