'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Sprint } from '@/types';
import { CreateSprintPayload } from '@/lib/api';

const sprintFormSchema = z
  .object({
    name: z.string().min(1, 'Name ist erforderlich').max(100),
    goal: z.string().max(500).optional(),
    startDate: z.string().min(1, 'Startdatum ist erforderlich'),
    endDate: z.string().min(1, 'Enddatum ist erforderlich'),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: 'Enddatum muss nach Startdatum liegen',
    path: ['endDate'],
  });

type SprintForm = z.infer<typeof sprintFormSchema>;

interface SprintModalProps {
  sprint?: Sprint;
  onSubmit: (data: CreateSprintPayload) => Promise<void>;
  onClose: () => void;
}

const toInputDate = (iso?: string) => (iso ? iso.split('T')[0] : '');

// Modal for creating a sprint (and editing while still in `planned` state).
// Mirrors TaskModal styling so the scrum section feels native to the app.
export const SprintModal = ({ sprint, onSubmit, onClose }: SprintModalProps) => {
  const isEditing = !!sprint;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SprintForm>({
    resolver: zodResolver(sprintFormSchema),
  });

  useEffect(() => {
    if (sprint) {
      reset({
        name: sprint.name,
        goal: sprint.goal ?? '',
        startDate: toInputDate(sprint.startDate),
        endDate: toInputDate(sprint.endDate),
      });
    } else {
      const today = new Date();
      const twoWeeks = new Date(today);
      twoWeeks.setDate(today.getDate() + 14);
      reset({
        name: '',
        goal: '',
        startDate: toInputDate(today.toISOString()),
        endDate: toInputDate(twoWeeks.toISOString()),
      });
    }
  }, [sprint, reset]);

  const onFormSubmit = async (values: SprintForm) => {
    setSubmitError(null);
    try {
      await onSubmit({
        name: values.name,
        goal: values.goal?.trim() ? values.goal : undefined,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Sprint konnte nicht gespeichert werden'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Sprint bearbeiten' : 'Neuer Sprint'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            aria-label="Schliessen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Name *
            </label>
            <input
              {...register('name')}
              placeholder="z.B. Sprint 3 - Login-Flow"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Sprint-Ziel
            </label>
            <textarea
              {...register('goal')}
              placeholder="Was soll am Ende dieses Sprints erreicht sein?"
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm resize-none"
            />
            {errors.goal && (
              <p className="text-red-500 text-xs mt-1">{errors.goal.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Start *
              </label>
              <input
                {...register('startDate')}
                type="date"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
              />
              {errors.startDate && (
                <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Ende *
              </label>
              <input
                {...register('endDate')}
                type="date"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
              />
              {errors.endDate && (
                <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {submitError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition"
            >
              {isSubmitting
                ? 'Wird gespeichert...'
                : isEditing
                  ? 'Aenderungen speichern'
                  : 'Sprint anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
