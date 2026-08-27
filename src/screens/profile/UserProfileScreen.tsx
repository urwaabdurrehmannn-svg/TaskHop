import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { Avatar, AvatarSize } from '../../components/common/Avatar';
import { SkillTag } from '../../components/common/SkillTag';
import { SectionHeader } from '../../components/common/SectionHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { ReviewsList } from '../../components/reviews/ReviewsList';
import { ActionMenu } from '../../components/trust/ActionMenu';
import { ReportModal } from '../../components/trust/ReportModal';
import { Colors, palette } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useReportBlockActions } from '../../hooks/useReportBlockActions';
import * as profileService from '../../services/profile/profileService';
import * as reviewService from '../../services/reviews/reviewService';
import type { RootStackParamList } from '../../navigation/types';
import type { Review } from '../../types/review';
import type { User } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

const AVAILABILITY_META: Record<string, { label: string; color: string }> = {
  available_now: { label: 'Available now', color: Colors.success },
  available_soon: { label: 'Free up soon', color: Colors.warning },
  busy: { label: 'Currently busy', color: Colors.textTertiary },
};

/**
 * Read-only view of someone else's profile -- ProfileScreen stays "my own
 * profile" (with Edit/Sign out/Blocked Users). This screen shows the same
 * public-safe fields (name, skills, rating, reviews) with no edit affordances.
 * `profiles`/`User` never included email in the first place, so there's no
 * separate redaction step needed here to keep it private.
 */
export function UserProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  const {
    menuVisible,
    menuTitle,
    menuOptions,
    closeMenu,
    reportModalVisible,
    reportModalTitle,
    presentUserActions,
    submitReport,
    closeReportModal,
    onReportSubmitted,
  } = useReportBlockActions();

  const load = useCallback(async () => {
    try {
      setError(null);
      const [profile, userReviews] = await Promise.all([
        profileService.fetchUserProfile(userId),
        reviewService.fetchReviewsForUser(userId),
      ]);
      setUser(profile);
      setReviews(userReviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this profile.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title={user?.name ?? 'Profile'}
        onBack={() => navigation.goBack()}
        rightIcon={user ? 'ellipsis-horizontal' : undefined}
        onRightPress={() => user && presentUserActions(user.id, user.name)}
      />

      {loading ? (
        <LoadingIndicator label="Loading profile…" />
      ) : error || !user ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Couldn't load this profile"
          subtitle={error ?? 'This profile may no longer be available.'}
          actionLabel="Try again"
          onAction={load}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[palette.indigo500, palette.indigo700]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
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
              <View style={[styles.dot, { backgroundColor: AVAILABILITY_META[user.availability].color }]} />
              <Text style={styles.availabilityText}>{AVAILABILITY_META[user.availability].label}</Text>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <Text style={styles.bio}>{user.bio}</Text>

            <View style={styles.statsGrid}>
              <View style={[styles.statTile, Shadow.sm]}>
                <Text style={styles.statValue}>{user.stats.reviewCount > 0 ? user.stats.avgRating.toFixed(1) : '—'}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={[styles.statTile, Shadow.sm]}>
                <Text style={styles.statValue}>{user.stats.reviewCount}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={[styles.statTile, Shadow.sm]}>
                <Text style={styles.statValue}>{user.stats.tasksCompleted}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
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
                <EmptyState icon="ribbon-outline" title="No skills listed" subtitle="This person hasn't added any skills yet." />
              </View>
            )}

            <SectionHeader
              title="Reviews"
              right={reviews.length > 0 ? <Text style={styles.reviewCount}>{reviews.length}</Text> : undefined}
            />
            <ReviewsList reviews={reviews} emptySubtitle="No reviews yet." />

            <Text style={styles.memberSince}>TaskHop member since {user.memberSince}</Text>
          </View>
        </ScrollView>
      )}

      <ActionMenu visible={menuVisible} title={menuTitle} options={menuOptions} onClose={closeMenu} />

      <ReportModal
        visible={reportModalVisible}
        title={reportModalTitle}
        onClose={closeReportModal}
        onSubmit={async (reason, description) => {
          await submitReport(reason, description);
          onReportSubmitted();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  banner: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
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
    paddingBottom: Spacing.xxl,
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
  reviewCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  memberSince: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

export default UserProfileScreen;
