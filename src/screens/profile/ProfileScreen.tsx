import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Avatar, AvatarSize } from '../../components/common/Avatar';
import { SkillTag } from '../../components/common/SkillTag';
import { SectionHeader } from '../../components/common/SectionHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { Button } from '../../components/common/Button';
import { ReviewsList } from '../../components/reviews/ReviewsList';
import { Colors, palette } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import * as reviewService from '../../services/reviews/reviewService';
import type { RootStackParamList } from '../../navigation/types';
import type { Review } from '../../types/review';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const AVAILABILITY_META: Record<string, { label: string; color: string }> = {
  available_now: { label: 'Available now', color: Colors.success },
  available_soon: { label: 'Free up soon', color: Colors.warning },
  busy: { label: 'Currently busy', color: Colors.textTertiary },
};

export function ProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavProp>();
  const { profile: user, profileError, refreshProfile, signOut } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);

  // Refresh whenever the tab regains focus, so stats like "Posted" stay
  // accurate after actions taken elsewhere (e.g. permanently deleting a task).
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      reviewService.fetchReviewsForUser(user.id).then(setReviews).catch(() => setReviews([]));
    }, [user?.id])
  );

  if (!user) {
    return (
      <ScreenContainer contentStyle={styles.centerContent}>
        {profileError ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Couldn't load your profile"
            subtitle={profileError}
            actionLabel="Try again"
            onAction={refreshProfile}
          />
        ) : (
          <LoadingIndicator label="Loading your profile…" />
        )}
      </ScreenContainer>
    );
  }

  const availability = AVAILABILITY_META[user.availability];

  const stats: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    {
      label: 'Rating',
      value: user.stats.reviewCount > 0 ? user.stats.avgRating.toFixed(1) : '—',
      icon: 'star',
    },
    { label: 'Posted', value: String(user.stats.tasksPosted), icon: 'megaphone' },
    { label: 'Skills', value: String(user.skills.length), icon: 'ribbon' },
    { label: 'Member since', value: user.memberSince, icon: 'calendar' },
  ];

  return (
    <ScreenContainer
      scroll
      contentStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + Spacing.xl }]}
      padded={false}
    >
      <LinearGradient
        colors={[palette.indigo500, palette.indigo700]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <Pressable
          onPress={() => navigation.navigate('EditProfile')}
          hitSlop={8}
          style={styles.editButton}
          accessibilityLabel="Edit profile"
        >
          <Ionicons name="create-outline" size={18} color={Colors.textInverse} />
        </Pressable>

        <Avatar
          name={user.name}
          initials={user.initials}
          color={palette.white}
          imageUrl={user.avatarUrl}
          size={AvatarSize.xl}
        />
        <Text style={styles.name}>{user.name}</Text>
        {user.university && <Text style={styles.university}>{user.university}</Text>}
        <View style={[styles.availabilityBadge, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
          <View style={[styles.dot, { backgroundColor: availability.color }]} />
          <Text style={styles.availabilityText}>{availability.label}</Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.bio}>{user.bio}</Text>

        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statTile, Shadow.sm]}>
              <Ionicons name={s.icon} size={16} color={Colors.primary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <SectionHeader title="Skills" />
        {user.skills.length > 0 ? (
          <View style={styles.skillsRow}>
            {user.skills.map((s) => (
              <SkillTag key={s.id} label={s.name} />
            ))}
          </View>
        ) : (
          <View style={styles.inlineEmpty}>
            <EmptyState
              icon="ribbon-outline"
              title="No skills added yet"
              subtitle="Add what you're good at so tasks can find you."
              actionLabel="Add skills"
              onAction={() => navigation.navigate('EditProfile')}
            />
          </View>
        )}

        <SectionHeader title="Completed tasks" />
        {user.completedTasks.length > 0 ? (
          user.completedTasks.map((task) => (
            <View key={task.id} style={[styles.completedCard, Shadow.sm]}>
              <View style={styles.completedTextWrap}>
                <Text style={styles.completedTitle} numberOfLines={1}>
                  {task.title}
                </Text>
                <Text style={styles.completedCategory}>{task.category}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.inlineEmpty}>
            <EmptyState
              icon="trophy-outline"
              title="No completed tasks yet"
              subtitle="Tasks you finish helping with will show up here."
            />
          </View>
        )}

        <SectionHeader
          title="Reviews"
          right={reviews.length > 0 ? <Text style={styles.reviewCount}>{reviews.length}</Text> : undefined}
        />
        <ReviewsList reviews={reviews} emptySubtitle="Reviews from people you've worked with will show up here." />

        <Text style={styles.memberSince}>TaskHop member since {user.memberSince}</Text>

        <Pressable style={styles.blockedRow} onPress={() => navigation.navigate('BlockedUsers')} hitSlop={4}>
          <View style={styles.blockedIconWrap}>
            <Ionicons name="shield-outline" size={14} color={Colors.textTertiary} />
          </View>
          <Text style={styles.blockedText}>Blocked Users</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
        </Pressable>

        <View style={styles.signOutWrap}>
          <Button label="Sign out" onPress={signOut} variant="outline" size="sm" fullWidth={false} icon="log-out-outline" />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {},
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  banner: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  editButton: {
    position: 'absolute',
    top: Spacing.xl,
    right: Spacing.lg,
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...Typography.h1,
    color: Colors.textInverse,
    marginTop: Spacing.sm,
  },
  university: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  availabilityText: {
    ...Typography.caption,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  bio: {
    ...Typography.bodyLg,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  statTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...Typography.h3,
  },
  statLabel: {
    ...Typography.caption,
    fontSize: 10,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.xl,
  },
  inlineEmpty: {
    marginBottom: Spacing.lg,
    marginHorizontal: -Spacing.md,
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  completedTextWrap: {
    flex: 1,
  },
  completedTitle: {
    ...Typography.bodySemibold,
    fontSize: 14,
  },
  completedCategory: {
    ...Typography.caption,
  },
  reviewCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  memberSince: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    alignSelf: 'center',
  },
  blockedIconWrap: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  signOutWrap: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
});

export default ProfileScreen;
