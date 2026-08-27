import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { TaskCard } from '../../components/task/TaskCard';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { useTasks } from '../../context/TaskContext';
import type { RootStackParamList } from '../../navigation/types';
import type { Task } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DeletedTasks'>;

/**
 * Cancelled tasks, kept as history -- cancelling a task never removes its
 * row, task_interests, or messages (see interestService/messageService),
 * so everything here stays fully accessible via Task Details. "Delete
 * Permanently" only sets tasks.deleted_at (taskService.permanentlyDeleteTask)
 * -- it never runs an actual DELETE, so interests/messages are untouched
 * even after this.
 */
export function DeletedTasksScreen({ navigation }: Props) {
  const { myTasks, deleteTaskPermanently } = useTasks();
  const deletedTasks = useMemo(() => myTasks.filter((t) => t.status === 'cancelled'), [myTasks]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function confirmDelete(taskId: string) {
    setDeletingId(taskId);
    try {
      await deleteTaskPermanently(taskId);
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleDeletePermanently(task: Task) {
    Alert.alert(
      'Delete this task permanently?',
      "This can't be undone. It will be removed from My Tasks and Deleted Tasks for good. Existing conversations and interested-helper history will still be preserved.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Permanently', style: 'destructive', onPress: () => confirmDelete(task.id) },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Deleted Tasks" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {deletedTasks.length === 0 ? (
          <EmptyState
            icon="trash-outline"
            title="No deleted tasks"
            subtitle="Tasks you cancel will show up here as history."
          />
        ) : (
          deletedTasks.map((task) => (
            <View key={task.id} style={styles.taskWrap}>
              <TaskCard task={task} onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })} />
              <Button
                label="Delete Permanently"
                icon="trash-outline"
                variant="danger"
                size="sm"
                fullWidth={false}
                loading={deletingId === task.id}
                onPress={() => handleDeletePermanently(task)}
                style={styles.deleteButton}
              />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  taskWrap: {
    marginBottom: Spacing.md,
  },
  deleteButton: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
  },
});

export default DeletedTasksScreen;
