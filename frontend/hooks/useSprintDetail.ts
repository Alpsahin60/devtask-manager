'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sprint } from '@/types';
import { sprintsApi, UpdateSprintPayload } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiError';

// Loads a single sprint by id. Used by the sprint detail page so it can
// render status controls, the countdown banner, and the linked sub-views.
export const useSprintDetail = (sprintId: string | null) => {
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSprint = useCallback(async () => {
    if (!sprintId) {
      setSprint(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await sprintsApi.getById(sprintId);
      setSprint(data.data ?? null);
    } catch (err) {
      setSprint(null);
      setError(getApiErrorMessage(err, 'Sprint konnte nicht geladen werden'));
    } finally {
      setIsLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    fetchSprint();
  }, [fetchSprint]);

  const updateSprint = async (payload: UpdateSprintPayload): Promise<Sprint> => {
    if (!sprintId) throw new Error('Kein Sprint ausgewaehlt');
    const { data } = await sprintsApi.update(sprintId, payload);
    if (!data.data) throw new Error('Sprint konnte nicht aktualisiert werden');
    setSprint(data.data);
    return data.data;
  };

  return { sprint, isLoading, error, refetch: fetchSprint, updateSprint };
};
