'use client';

import { useState } from 'react';
import { Sprint, SprintStatus } from '@/types';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/apiError';
import { UpdateSprintPayload } from '@/lib/api';

interface SprintStatusControlsProps {
  sprint: Sprint;
  onUpdate: (payload: UpdateSprintPayload) => Promise<Sprint>;
}

const TRANSITIONS: Record<SprintStatus, { to: SprintStatus; label: string; tone: 'primary' | 'neutral' | 'danger' }[]> = {
  planned: [
    { to: 'active', label: 'Sprint starten', tone: 'primary' },
    { to: 'cancelled', label: 'Abbrechen', tone: 'danger' },
  ],
  active: [
    { to: 'completed', label: 'Sprint abschliessen', tone: 'primary' },
    { to: 'cancelled', label: 'Abbrechen', tone: 'danger' },
  ],
  completed: [],
  cancelled: [],
};

const buttonClasses = (tone: 'primary' | 'neutral' | 'danger') => {
  const base = 'px-3 py-2 text-sm font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed';
  if (tone === 'primary')
    return `${base} bg-blue-600 hover:bg-blue-700 text-white`;
  if (tone === 'danger')
    return `${base} border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`;
  return `${base} border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800`;
};

// Encapsulates the status machine actions. Critically: when the backend
// returns 409 (e.g. another sprint is already active, terminal state) we
// surface a clean toast instead of crashing the page.
export const SprintStatusControls = ({ sprint, onUpdate }: SprintStatusControlsProps) => {
  const toast = useToast();
  const [pendingStatus, setPendingStatus] = useState<SprintStatus | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReview, setShowReview] = useState(false);

  const transitions = TRANSITIONS[sprint.status];

  const applyTransition = async (to: SprintStatus, payload: UpdateSprintPayload = {}) => {
    setPendingStatus(to);
    try {
      await onUpdate({ status: to, ...payload });
      toast.success(`Sprint ist jetzt ${to === 'active' ? 'aktiv' : to === 'completed' ? 'abgeschlossen' : to === 'cancelled' ? 'abgebrochen' : 'geplant'}.`);
      setShowReview(false);
      setReviewNotes('');
    } catch (err) {
      const status = getApiErrorStatus(err);
      const message = getApiErrorMessage(
        err,
        status === 409
          ? 'Statuswechsel nicht moeglich.'
          : 'Sprint konnte nicht aktualisiert werden'
      );
      toast.error(message);
    } finally {
      setPendingStatus(null);
    }
  };

  if (transitions.length === 0) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
        Dieser Sprint ist read-only.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {transitions.map(({ to, label, tone }) => {
          const requiresReview = sprint.status === 'active' && to === 'completed';
          const onClick = () => {
            if (requiresReview) {
              setShowReview((current) => !current);
              return;
            }
            applyTransition(to);
          };
          return (
            <button
              key={to}
              type="button"
              onClick={onClick}
              disabled={pendingStatus !== null}
              className={buttonClasses(tone)}
            >
              {pendingStatus === to ? 'Bitte warten...' : label}
            </button>
          );
        })}
      </div>

      {showReview && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Review-Notizen (optional, danach nicht mehr aenderbar)
          </label>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Was wurde geliefert? Was war das Feedback?"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReview(false)}
              className={buttonClasses('neutral')}
              disabled={pendingStatus !== null}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() =>
                applyTransition('completed', reviewNotes.trim() ? { reviewNotes } : {})
              }
              className={buttonClasses('primary')}
              disabled={pendingStatus !== null}
            >
              {pendingStatus === 'completed' ? 'Wird abgeschlossen...' : 'Bestaetigen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
