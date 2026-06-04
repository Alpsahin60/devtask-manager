'use client';

import { useState } from 'react';
import { Sprint, RetroCategory, RetroItem } from '@/types';
import { useRetro } from '@/hooks/useRetro';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/lib/apiError';

interface RetroBoardProps {
  sprint: Sprint;
}

const COLUMNS: { category: RetroCategory; title: string; tone: string }[] = [
  {
    category: 'mad',
    title: 'Mad',
    tone: 'border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-900/10',
  },
  {
    category: 'sad',
    title: 'Sad',
    tone: 'border-yellow-200 dark:border-yellow-900/40 bg-yellow-50/60 dark:bg-yellow-900/10',
  },
  {
    category: 'glad',
    title: 'Glad',
    tone: 'border-green-200 dark:border-green-900/40 bg-green-50/60 dark:bg-green-900/10',
  },
];

interface RetroColumnProps {
  category: RetroCategory;
  title: string;
  tone: string;
  items: RetroItem[];
  canEdit: boolean;
  onAdd: (category: RetroCategory, content: string) => Promise<void>;
  onDelete: (item: RetroItem) => Promise<void>;
}

const RetroColumn = ({ category, title, tone, items, canEdit, onAdd, onDelete }: RetroColumnProps) => {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setPending(true);
    try {
      await onAdd(category, draft.trim());
      setDraft('');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={`rounded-xl border ${tone} flex flex-col`}>
      <header className="px-4 py-3 border-b border-inherit flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        <span className="text-xs font-medium bg-white/70 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">
          {items.length}
        </span>
      </header>

      <div className="flex-1 p-3 space-y-2 min-h-[180px]">
        {items.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            Noch nichts erfasst.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item._id}
              className="group rounded-lg bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 shadow-sm flex items-start justify-between gap-2"
            >
              <span className="whitespace-pre-wrap flex-1">{item.content}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition"
                  aria-label="Retro-Item loeschen"
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canEdit && (
        <form onSubmit={submit} className="border-t border-inherit p-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Neues Item hinzufuegen..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-lg transition"
          >
            {pending ? 'Wird hinzugefuegt...' : 'Hinzufuegen'}
          </button>
        </form>
      )}
    </div>
  );
};

export const RetroBoard = ({ sprint }: RetroBoardProps) => {
  const { items, isLoading, error, createItem, deleteItem } = useRetro(sprint._id);
  const toast = useToast();

  const canEdit = sprint.status === 'active';

  const handleAdd = async (category: RetroCategory, content: string) => {
    try {
      await createItem({ category, content });
      toast.success('Retro-Item hinzugefuegt.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Retro-Item konnte nicht hinzugefuegt werden'));
    }
  };

  const handleDelete = async (item: RetroItem) => {
    try {
      await deleteItem(item._id, item.category);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Retro-Item konnte nicht geloescht werden'));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Retrospektive · Mad / Sad / Glad
        </h2>
        {!canEdit && (
          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
            Read-only — Sprint ist {sprint.status === 'completed' ? 'abgeschlossen' : sprint.status === 'cancelled' ? 'abgebrochen' : 'noch nicht aktiv'}.
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Retro wird geladen...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <RetroColumn
              key={col.category}
              category={col.category}
              title={col.title}
              tone={col.tone}
              items={items[col.category]}
              canEdit={canEdit}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
};
