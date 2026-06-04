import { SprintStatus } from '@/types';

const STATUS_LABELS: Record<SprintStatus, string> = {
  planned: 'Geplant',
  active: 'Aktiv',
  completed: 'Abgeschlossen',
  cancelled: 'Abgebrochen',
};

const STATUS_STYLES: Record<SprintStatus, string> = {
  planned:
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed:
    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  cancelled:
    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const SprintStatusBadge = ({ status }: { status: SprintStatus }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
  >
    {STATUS_LABELS[status]}
  </span>
);
