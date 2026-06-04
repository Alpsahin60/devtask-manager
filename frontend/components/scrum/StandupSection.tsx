'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sprint, StandupEntry } from '@/types';
import { useStandups } from '@/hooks/useStandups';
import { useToast } from '@/hooks/useToast';
import { UpsertStandupPayload } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiError';

interface StandupSectionProps {
  sprint: Sprint;
}

const standupFormSchema = z.object({
  date: z.string().min(1, 'Datum ist erforderlich'),
  yesterday: z.string().max(500).optional(),
  today: z.string().max(500).optional(),
  blockers: z.string().max(500).optional(),
});
type StandupForm = z.infer<typeof standupFormSchema>;

const todayDateInput = () => new Date().toISOString().split('T')[0];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const StandupCard = ({ entry }: { entry: StandupEntry }) => (
  <article className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
    <header className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
      {formatDate(entry.date)}
    </header>
    <dl className="space-y-2 text-sm">
      <div>
        <dt className="text-gray-500 dark:text-gray-400">Gestern</dt>
        <dd className="text-gray-900 dark:text-gray-200 whitespace-pre-wrap">
          {entry.yesterday?.trim() || <span className="text-gray-400 italic">—</span>}
        </dd>
      </div>
      <div>
        <dt className="text-gray-500 dark:text-gray-400">Heute</dt>
        <dd className="text-gray-900 dark:text-gray-200 whitespace-pre-wrap">
          {entry.today?.trim() || <span className="text-gray-400 italic">—</span>}
        </dd>
      </div>
      <div>
        <dt className="text-gray-500 dark:text-gray-400">Blocker</dt>
        <dd className="text-gray-900 dark:text-gray-200 whitespace-pre-wrap">
          {entry.blockers?.trim() || <span className="text-gray-400 italic">—</span>}
        </dd>
      </div>
    </dl>
  </article>
);

export const StandupSection = ({ sprint }: StandupSectionProps) => {
  const { standups, isLoading, error, upsertStandup } = useStandups(sprint._id);
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StandupForm>({
    resolver: zodResolver(standupFormSchema),
    defaultValues: {
      date: todayDateInput(),
      yesterday: '',
      today: '',
      blockers: '',
    },
  });

  const canCreate = sprint.status === 'active';

  const onSubmit = async (values: StandupForm) => {
    setFormError(null);
    try {
      const payload: UpsertStandupPayload = {
        date: new Date(values.date).toISOString(),
        yesterday: values.yesterday?.trim() || undefined,
        today: values.today?.trim() || undefined,
        blockers: values.blockers?.trim() || undefined,
      };
      await upsertStandup(payload);
      toast.success('Standup gespeichert.');
      reset({
        date: todayDateInput(),
        yesterday: '',
        today: '',
        blockers: '',
      });
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Standup konnte nicht gespeichert werden'));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Daily Standup
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {standups.length} Eintrag{standups.length === 1 ? '' : 'e'}
        </span>
      </div>

      {canCreate ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-[180px,1fr]">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Datum
              </label>
              <input
                {...register('date')}
                type="date"
                min={sprint.startDate.split('T')[0]}
                max={sprint.endDate.split('T')[0]}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.date && (
                <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Gestern
              </label>
              <textarea
                {...register('yesterday')}
                rows={3}
                placeholder="Was wurde gestern erledigt?"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Heute
              </label>
              <textarea
                {...register('today')}
                rows={3}
                placeholder="Was ist heute geplant?"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Blocker
              </label>
              <textarea
                {...register('blockers')}
                rows={3}
                placeholder="Was haelt mich auf?"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {formError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition"
            >
              {isSubmitting ? 'Wird gespeichert...' : 'Standup speichern'}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm text-gray-500 dark:text-gray-400">
          Standups koennen nur waehrend eines aktiven Sprints erfasst werden.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Standups werden geladen...</p>
      ) : standups.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Noch keine Standups erfasst.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {standups.map((entry) => (
            <StandupCard key={entry._id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
};
