import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, getCategoryColor } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar, AvatarSize } from '../common/Avatar';
import { SkillTag } from '../common/SkillTag';
import { Badge } from '../common/Badge';
import { getCategoryIcon } from '../../data/categories';
import type { Task } from '../../types';
import { formatDeadline } from '../../utils/date';
import { describeExchange } from '../../utils/exchange';

interface TaskCardProps {
  task: Task;
  onPress?: () => void;
}

const STATUS_META: Record<Task['status'], { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: Colors.success, bg: Colors.successLight },
  matching: { label: 'Matching', color: Colors.accentDark, bg: Colors.accentLight },
  in_progress: { label: 'In progress', color: Colors.primary, bg: Colors.primaryLight },
  completed: { label: 'Completed', color: Colors.textSecondary, bg: Colors.surfaceAlt },
  cancelled: { label: 'Cancelled', color: Colors.danger, bg: Colors.dangerLight },
};

export function TaskCard({ task, onPress }: TaskCardProps) {
  const categoryColor = getCategoryColor(task.category);
  const status = STATUS_META[task.status];
  const visibleSkills = task.skills.slice(0, 2);
  const extraSkillCount = task.skills.length - visibleSkills.length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, Shadow.sm, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.categoryBadgeWrap}>
          <Badge
            label={task.category}
            icon={getCategoryIcon(task.category)}
            bg={categoryColor.bg}
            color={categoryColor.text}
            size="sm"
          />
        </View>
        <Badge label={status.label} bg={status.bg} color={status.color} size="sm" />
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {task.title}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {task.description}
      </Text>

      <View style={styles.skillsRow}>
        {visibleSkills.map((s) => (
          <SkillTag key={s.id} label={s.name} size="sm" />
        ))}
        {extraSkillCount > 0 && (
          <View style={styles.moreChip}>
            <Text style={styles.moreChipText}>+{extraSkillCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.offerRow}>
        <Ionicons
          name={task.exchangeType === 'money' ? 'cash-outline' : 'swap-horizontal-outline'}
          size={13}
          color={Colors.textSecondary}
        />
        <Text style={styles.offerText} numberOfLines={1}>
          {describeExchange(task.exchangeType, task.offeredSkill, task.offeredAmount)}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.posterRow}>
          <Avatar
            name={task.poster.name}
            initials={task.poster.initials}
            color={task.poster.avatarColor}
            imageUrl={task.poster.avatarUrl}
            size={AvatarSize.sm}
          />
          <Text style={styles.posterName} numberOfLines={1}>
            {task.poster.name.split(' ')[0]}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={Colors.textTertiary} />
          <Text style={styles.metaText}>{formatDeadline(task.deadline)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pressed: {
    opacity: 0.9,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  categoryBadgeWrap: {
    flexShrink: 1,
    marginRight: Spacing.xs,
  },
  title: {
    ...Typography.h3,
    marginBottom: 4,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  moreChip: {
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  moreChipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  offerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  posterName: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.caption,
  },
});

export default TaskCard;
