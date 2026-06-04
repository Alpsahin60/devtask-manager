'use client';

import Link from 'next/link';
import { Sprint } from '@/types';
import { SprintStatusBadge } from './SprintStatusBadge';

interface SprintCardProps {
  sprint: Sprint;
  onDelete?: (id: string) => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('de-CH');

const sprintLengthDays = (sprint: Sprint): number => {
  const ms = new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime();
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
};

export const SprintCard = ({ sprint, onDelete }: SprintCardProps) => {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition">
      <div className="flex items-start justify-between gap-3 mb-2">
        <Link
          href={`/dashboard/scrum/${sprint._id}`}
          className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          {sprint.name}
        </Link>
        <SprintStatusBadge status={sprint.status} />
      </div>

      {sprint.goal && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {sprint.goal}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
        </span>
        <span>{sprintLengthDays(sprint)} Tage</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Link
          href={`/dashboard/scrum/${sprint._id}`}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Oeffnen →
        </Link>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(sprint._id)}
            className="text-xs text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition"
            aria-label={`Sprint ${sprint.name} loeschen`}
          >
            Loeschen
          </button>
        )}
      </div>
    </div>
  );
};
