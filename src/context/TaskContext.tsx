import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CreateTaskInput, Task } from '../types';
import * as taskService from '../services/tasks/taskService';
import { useAuth } from './AuthContext';

const ACTIVE_STATUSES: Task['status'][] = ['open', 'matching', 'in_progress'];

interface TaskContextValue {
  /** Active tasks across all users -- the discovery pool for "Open Opportunities". */
  tasks: Task[];
  /** Every task the current user has posted, any status -- includes completed/cancelled as history. */
  myTasks: Task[];
  loading: boolean;
  myTasksLoading: boolean;
  error: string | null;
  myTasksError: string | null;
  addTask: (input: CreateTaskInput) => Promise<Task>;
  getTaskById: (id: string) => Task | undefined;
  refreshTasks: () => Promise<void>;
  refreshMyTasks: () => Promise<void>;
  setTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  deleteTaskPermanently: (taskId: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [myTasksError, setMyTasksError] = useState<string | null>(null);

  const refreshTasks = useCallback(async () => {
    try {
      setError(null);
      const fetched = await taskService.fetchTasks();
      setTasks(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const refreshMyTasks = useCallback(async () => {
    if (!session) {
      setMyTasks([]);
      return;
    }
    try {
      setMyTasksError(null);
      const fetched = await taskService.fetchMyTasks(session.user.id);
      setMyTasks(fetched);
    } catch (err) {
      setMyTasksError(err instanceof Error ? err.message : 'Could not load your tasks.');
    } finally {
      setMyTasksLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      setMyTasksLoading(true);
      refreshMyTasks();
    } else {
      setMyTasks([]);
      setMyTasksLoading(false);
    }
  }, [session, refreshMyTasks]);

  const addTask = useCallback(
    async (input: CreateTaskInput) => {
      if (!session || !profile) {
        throw new Error('You need to be signed in to post a task.');
      }
      const newTask = await taskService.createTask(input, profile);
      setTasks((prev) => [newTask, ...prev]);
      setMyTasks((prev) => [newTask, ...prev]);
      return newTask;
    },
    [session, profile]
  );

  const getTaskById = useCallback(
    (id: string) => tasks.find((t) => t.id === id) ?? myTasks.find((t) => t.id === id),
    [tasks, myTasks]
  );

  const setTaskStatus = useCallback(async (taskId: string, status: Task['status']) => {
    await taskService.updateTaskStatus(taskId, status);
    const isActive = (ACTIVE_STATUSES as string[]).includes(status);
    setTasks((prev) =>
      isActive ? prev.map((t) => (t.id === taskId ? { ...t, status } : t)) : prev.filter((t) => t.id !== taskId)
    );
    setMyTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  }, []);

  const deleteTaskPermanently = useCallback(async (taskId: string) => {
    await taskService.permanentlyDeleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setMyTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const value = useMemo(
    () => ({
      tasks,
      myTasks,
      loading,
      myTasksLoading,
      error,
      myTasksError,
      addTask,
      getTaskById,
      refreshTasks,
      refreshMyTasks,
      setTaskStatus,
      deleteTaskPermanently,
    }),
    [
      tasks,
      myTasks,
      loading,
      myTasksLoading,
      error,
      myTasksError,
      addTask,
      getTaskById,
      refreshTasks,
      refreshMyTasks,
      setTaskStatus,
      deleteTaskPermanently,
    ]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return ctx;
}
