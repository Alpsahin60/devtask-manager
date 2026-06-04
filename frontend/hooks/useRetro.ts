'use client';

import { useState, useEffect, useCallback } from 'react';
import { RetroGrouped, RetroItem, RetroCategory } from '@/types';
import { retroApi, CreateRetroItemPayload } from '@/lib/api';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/apiError';

const EMPTY: RetroGrouped = { mad: [], sad: [], glad: [] };

export const useRetro = (sprintId: string | null) => {
  const [items, setItems] = useState<RetroGrouped>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!sprintId) {
      setItems(EMPTY);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await retroApi.list(sprintId);
      setItems(data.data ?? EMPTY);
    } catch (err) {
      if (getApiErrorStatus(err) === 404) {
        setItems(EMPTY);
      } else {
        setError(getApiErrorMessage(err, 'Retro konnte nicht geladen werden'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (payload: CreateRetroItemPayload): Promise<RetroItem> => {
    if (!sprintId) throw new Error('Kein Sprint ausgewaehlt');
    const { data } = await retroApi.create(sprintId, payload);
    if (!data.data) throw new Error('Retro-Item konnte nicht erstellt werden');
    const saved = data.data;
    setItems((prev) => ({
      ...prev,
      [saved.category]: [saved, ...prev[saved.category]],
    }));
    return saved;
  };

  const deleteItem = async (itemId: string, category: RetroCategory) => {
    if (!sprintId) throw new Error('Kein Sprint ausgewaehlt');
    await retroApi.delete(sprintId, itemId);
    setItems((prev) => ({
      ...prev,
      [category]: prev[category].filter((i) => i._id !== itemId),
    }));
  };

  return { items, isLoading, error, createItem, deleteItem, refetch: fetchItems };
};
