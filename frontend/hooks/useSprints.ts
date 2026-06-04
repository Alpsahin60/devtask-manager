'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sprint, SprintStatus } from '@/types';
import { sprintsApi, CreateSprintPayload, UpdateSprintPayload } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiError';

// Mirrors useTasks: one stateful list + CRUD helpers that throw on failure so
// the caller can show a toast or inline error. Backend validates owner-only
// access, so we trust the response shape.
export const useSprints = () => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSprints = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await sprintsApi.getAll();
      setSprints(data.data ?? []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Sprints konnten nicht geladen werden'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  const createSprint = async (payload: CreateSprintPayload): Promise<Sprint> => {
    const { data } = await sprintsApi.create(payload);
    if (!data.data) throw new Error('Sprint konnte nicht erstellt werden');
    setSprints((prev) => [data.data!, ...prev]);
    return data.data;
  };

  const updateSprint = async (
    id: string,
    payload: UpdateSprintPayload
  ): Promise<Sprint> => {
    const { data } = await sprintsApi.update(id, payload);
    if (!data.data) throw new Error('Sprint konnte nicht aktualisiert werden');
    setSprints((prev) => prev.map((s) => (s._id === id ? data.data! : s)));
    return data.data;
  };

  const deleteSprint = async (id: string) => {
    await sprintsApi.delete(id);
    setSprints((prev) => prev.filter((s) => s._id !== id));
  };

  return {
    sprints,
    isLoading,
    error,
    createSprint,
    updateSprint,
    deleteSprint,
    refetch: fetchSprints,
    byStatus: (status: SprintStatus) => sprints.filter((s) => s.status === status),
  };
};
