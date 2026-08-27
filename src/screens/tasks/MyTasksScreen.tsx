import React, { useCallback, useMemo } from 'react';
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
import { TaskCard } from '../../components/task/TaskCard';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useTasks } from '../../context/TaskContext';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'MyTasks'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/** Cancelled tasks live in the separate "Deleted Tasks" screen, not mixed into this list. */
export function MyTasksScreen() {
  const navigation = useNavigation<NavProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const { myTasks, myTasksLoading, myTasksError, refreshMyTasks } = useTasks();

  useFocusEffect(
    useCallback(() => {
      refreshMyTasks();
    }, [refreshMyTasks])
  );

  const activeTasks = useMemo(() => myTasks.filter((t) => t.status !== 'cancelled'), [myTasks]);
  const deletedCount = useMemo(() => myTasks.filter((t) => t.status === 'cancelled').length, [myTasks]);

  return (
    <ScreenContainer
      scroll
      contentStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + Spacing.xl }]}
      edges={['top', 'left', 'right']}
    >
      <ScreenHeader title="My Tasks" subtitle="Everything you've posted, and where it stands." />

      {myTasksLoading && myTasks.length === 0 ? (
        <LoadingIndicator label="Loading your tasks…" />
      ) : myTasksError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your tasks"
          subtitle={myTasksError}
          actionLabel="Try again"
          onAction={refreshMyTasks}
        />
      ) : activeTasks.length === 0 ? (
        <EmptyState
          icon="briefcase-outline"
          title="You haven't posted a task yet"
          subtitle="Post a task to find someone who can help."
          actionLabel="Post a task"
          onAction={() => navigation.navigate('Create')}
        />
      ) : (
        <View>
          {activeTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
            />
          ))}
        </View>
      )}

      <Pressable style={styles.deletedRow} onPress={() => navigation.navigate('DeletedTasks')} hitSlop={4}>
        <View style={styles.deletedIconWrap}>
          <Ionicons name="trash-outline" size={14} color={Colors.textTertiary} />
        </View>
        <Text style={styles.deletedText}>Deleted Tasks</Text>
        {deletedCount > 0 && <Text style={styles.deletedCount}>{deletedCount}</Text>}
        <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: Spacing.xs,
  },
  deletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.lg,
  },
  deletedIconWrap: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletedText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    flex: 1,
  },
  deletedCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});

export default MyTasksScreen;
