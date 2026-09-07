import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Avatar, AvatarSize } from '../../components/common/Avatar';
import { Input } from '../../components/common/Input';
import { FilterChip } from '../../components/common/FilterChip';
import { EmptyState } from '../../components/common/EmptyState';
import { TaskListSkeleton } from '../../components/common/Skeleton';
import { TaskCard } from '../../components/task/TaskCard';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { Colors } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useTasks } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES } from '../../data/categories';
import { AnimatedPressable, usePressScale } from '../../hooks/usePressScale';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import type { TaskCategory } from '../../types';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const { tasks, loading, error, refreshTasks } = useTasks();
  const { profile } = useAuth();
  const [activeCategory, setActiveCategory] = useState<TaskCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const firstName = profile?.name.split(' ')[0] ?? 'there';
  const postCardPress = usePressScale();
  const skillCardPress = usePressScale();

  // Refresh whenever the tab regains focus (e.g. returning after posting a
  // task, or another user's task having been posted since the last visit).
  useFocusEffect(
    useCallback(() => {
      refreshTasks();
    }, [refreshTasks])
  );

  // Open Opportunities is always someone else's task -- never the current
  // user's own, regardless of category filter.
  const openOpportunities = useMemo(
    () => tasks.filter((t) => t.poster.id !== profile?.id),
    [tasks, profile]
  );

  const filteredTasks = useMemo(
    () => (activeCategory ? openOpportunities.filter((t) => t.category === activeCategory) : openOpportunities),
    [openOpportunities, activeCategory]
  );

  // Layered on top of the category filter above -- an empty query leaves
  // filteredTasks unchanged, a non-empty one narrows it further by matching
  // title, description, or any required skill name, case-insensitively.
  const searchedTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return filteredTasks;
    return filteredTasks.filter((t) => {
      const haystack = [t.title, t.description, ...t.skills.map((s) => s.name)].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [filteredTasks, searchQuery]);

  return (
    <ScreenContainer
      scroll
      contentStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + Spacing.xl }]}
      edges={['top', 'left', 'right']}
    >
      <ScreenHeader
        eyebrow={getGreeting()}
        title={`Hey, ${firstName}`}
        subtitle="Here's what's happening around you."
        right={
          <View style={styles.headerActions}>
            <NotificationBell onPress={() => navigation.navigate('Notifications')} />
            {profile && (
              <AnimatedPressable onPress={() => navigation.navigate('Profile')} hitSlop={8}>
                <Avatar
                  name={profile.name}
                  initials={profile.initials}
                  color={profile.avatarColor}
                  imageUrl={profile.avatarUrl}
                  size={AvatarSize.md}
                  availability={profile.availability}
                />
              </AnimatedPressable>
            )}
          </View>
        }
      />

      <View style={styles.actionsRow}>
        <AnimatedPressable
          style={[styles.actionCard, styles.actionCardPrimary, postCardPress.style]}
          onPress={() => navigation.navigate('Create')}
          onPressIn={postCardPress.onPressIn}
          onPressOut={postCardPress.onPressOut}
          accessibilityRole="button"
        >
          <View style={styles.actionIconWrap}>
            <Ionicons name="help-buoy" size={20} color={Colors.textInverse} />
          </View>
          <Text style={styles.actionTitle}>Need something{'\n'}done quickly?</Text>
          <View style={styles.actionCta}>
            <Text style={styles.actionCtaText}>Post a task</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.textInverse} />
          </View>
        </AnimatedPressable>

        <AnimatedPressable
          style={[styles.actionCard, styles.actionCardAccent, skillCardPress.style]}
          onPress={() => navigation.navigate('Profile')}
          onPressIn={skillCardPress.onPressIn}
          onPressOut={skillCardPress.onPressOut}
          accessibilityRole="button"
        >
          <View style={styles.actionIconWrap}>
            <Ionicons name="sparkles" size={20} color={Colors.textInverse} />
          </View>
          <Text style={styles.actionTitle}>Got a skill{'\n'}to offer?</Text>
          <View style={styles.actionCta}>
            <Text style={styles.actionCtaText}>Update profile</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.textInverse} />
          </View>
        </AnimatedPressable>
      </View>

      <Input
        placeholder="Search tasks..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        icon="search-outline"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <SectionHeader title="Categories" />
      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => {
          const isActive = activeCategory === item.name;
          return (
            <View style={styles.categoryChipWrap}>
              <FilterChip
                label={item.name}
                icon={item.icon}
                active={isActive}
                onPress={() => setActiveCategory(isActive ? null : item.name)}
              />
            </View>
          );
        }}
      />

      <SectionHeader
        title={activeCategory ?? 'Open opportunities'}
        right={<Text style={styles.feedCount}>{searchedTasks.length} tasks</Text>}
      />

      {loading && tasks.length === 0 ? (
        <TaskListSkeleton />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load tasks"
          subtitle={error}
          actionLabel="Try again"
          onAction={refreshTasks}
        />
      ) : searchedTasks.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No tasks here yet"
          subtitle="Try another category, or be the first to post one."
          actionLabel="Post a task"
          onAction={() => navigation.navigate('Create')}
        />
      ) : (
        <View>
          {searchedTasks.map((task, idx) => (
            <TaskCard
              key={task.id}
              task={task}
              index={idx}
              onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
            />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: Spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  actionCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    minHeight: 148,
    justifyContent: 'space-between',
    ...Shadow.md,
  },
  actionCardPrimary: {
    backgroundColor: Colors.primary,
  },
  actionCardAccent: {
    backgroundColor: Colors.accent,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    ...Typography.h3,
    color: Colors.textInverse,
  },
  actionCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCtaText: {
    ...Typography.caption,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  categoryList: {
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  categoryChipWrap: {
    marginRight: Spacing.xs,
  },
  feedCount: {
    ...Typography.caption,
  },
});

export default HomeScreen;
