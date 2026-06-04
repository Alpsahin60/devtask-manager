'use client';

import { useState, useEffect, useCallback } from 'react';
import { StandupEntry } from '@/types';
import { standupsApi, UpsertStandupPayload } from '@/lib/api';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/apiError';

export const useStandups = (sprintId: string | null) => {
  const [standups, setStandups] = useState<StandupEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStandups = useCallback(async () => {
    if (!sprintId) {
      setStandups([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await standupsApi.list(sprintId);
      setStandups(data.data ?? []);
    } catch (err) {
      // 404 simply means "no access" or "no standups yet" — surface an empty
      // list, not a destructive error.
      if (getApiErrorStatus(err) === 404) {
        setStandups([]);
      } else {
        setError(getApiErrorMessage(err, 'Standups konnten nicht geladen werden'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    fetchStandups();
  }, [fetchStandups]);

  const upsertStandup = async (
    payload: UpsertStandupPayload
  ): Promise<StandupEntry> => {
    if (!sprintId) throw new Error('Kein Sprint ausgewaehlt');
    const { data } = await standupsApi.upsert(sprintId, payload);
    if (!data.data) throw new Error('Standup konnte nicht gespeichert werden');
    const saved = data.data;
    setStandups((prev) => {
      const exists = prev.some((s) => s._id === saved._id);
      if (exists) return prev.map((s) => (s._id === saved._id ? saved : s));
      return [...prev, saved].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });
    return saved;
  };

  return { standups, isLoading, error, upsertStandup, refetch: fetchStandups };
};
