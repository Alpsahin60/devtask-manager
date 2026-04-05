'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task } from '@/types';
import { tasksApi } from '@/lib/api';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await tasksApi.getAll();
      setTasks(data.data ?? []);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (taskData: Partial<Task>) => {
    const { data } = await tasksApi.create(taskData);
    if (data.data) setTasks((prev) => [data.data!, ...prev]);
  };

  const updateTask = async (id: string, taskData: Partial<Task>) => {
    const { data } = await tasksApi.update(id, taskData);
    if (data.data) {
      setTasks((prev) => prev.map((t) => (t._id === id ? data.data! : t)));
    }
  };

  const deleteTask = async (id: string) => {
    await tasksApi.delete(id);
    setTasks((prev) => prev.filter((t) => t._id !== id));
  };

  // Optimistic update for drag & drop — update UI immediately, sync with API
  const moveTask = async (id: string, newStatus: Task['status']) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === id ? { ...t, status: newStatus } : t))
    );
    try {
      await tasksApi.update(id, { status: newStatus });
    } catch {
      // Revert on failure
      fetchTasks();
    }
  };

  return { tasks, isLoading, error, createTask, updateTask, deleteTask, moveTask, refetch: fetchTasks };
};
