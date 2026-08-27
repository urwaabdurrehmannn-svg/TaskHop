import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar, AvatarSize } from '../common/Avatar';
import { Button } from '../common/Button';
import type { Match } from '../../types';

interface MatchCardProps {
  match: Match;
  onConnect?: (userId: string) => void;
  connected?: boolean;
  connecting?: boolean;
  onMoreOptions?: (userId: string, userName: string) => void;
}

const AVAILABILITY_LABEL: Record<string, string> = {
  available_now: 'Available now',
  available_soon: 'Free up soon',
  busy: 'Currently busy',
};

function scoreColor(score: number) {
  if (score >= 85) return Colors.success;
  if (score >= 65) return Colors.primary;
  return Colors.warning;
}

export function MatchCard({ match, onConnect, connected, connecting, onMoreOptions }: MatchCardProps) {
  const { user } = match;
  const color = scoreColor(match.score);

  return (
    <View style={[styles.card, Shadow.sm]}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Avatar
            name={user.name}
            initials={user.initials}
            color={user.avatarColor}
            imageUrl={user.avatarUrl}
            size={AvatarSize.lg}
            availability={user.availability}
          />
          <View style={styles.userText}>
            <Text style={styles.name} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.availability}>{AVAILABILITY_LABEL[user.availability]}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.scoreBadge, { backgroundColor: `${color}1A`, borderColor: color }]}>
            <Text style={[styles.scoreText, { color }]}>{match.score}%</Text>
            <Text style={[styles.scoreLabel, { color }]}>match</Text>
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
      </View>

      <View style={styles.reasons}>
        {match.reasons.map((reason) => (
          <View key={reason.id} style={styles.reasonRow}>
            <View style={[styles.checkCircle, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="checkmark" size={11} color={Colors.success} />
            </View>
            <Text style={styles.reasonText} numberOfLines={1}>
              {reason.label}
            </Text>
          </View>
        ))}
      </View>

      <Button
        label={connected ? 'Invited ✓' : 'Connect'}
        onPress={() => onConnect?.(user.id)}
        size="sm"
        icon={connected ? 'checkmark-circle' : 'chatbubble-ellipses-outline'}
        variant={connected ? 'secondary' : 'primary'}
        loading={connecting}
        disabled={connected}
      />
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.xs,
  },
  userText: {
    marginLeft: Spacing.xs,
    flex: 1,
  },
  name: {
    ...Typography.bodySemibold,
  },
  availability: {
    ...Typography.caption,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  moreButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadge: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 64,
  },
  scoreText: {
    fontSize: 17,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reasons: {
    marginBottom: Spacing.sm,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  reasonText: {
    ...Typography.body,
    flex: 1,
  },
});

export default MatchCard;
