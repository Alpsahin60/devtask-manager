'use client';

import { Sprint, SprintStatus } from '@/types';
import { SprintCard } from './SprintCard';

interface SprintListProps {
  sprints: Sprint[];
  onDelete?: (id: string) => void;
}

const SECTIONS: { status: SprintStatus; title: string }[] = [
  { status: 'active', title: 'Aktiv' },
  { status: 'planned', title: 'Geplant' },
  { status: 'completed', title: 'Abgeschlossen' },
  { status: 'cancelled', title: 'Abgebrochen' },
];

export const SprintList = ({ sprints, onDelete }: SprintListProps) => {
  if (sprints.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Noch keine Sprints angelegt. Beginne mit deinem ersten Sprint.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => {
        const sectionSprints = sprints.filter((s) => s.status === section.status);
        if (sectionSprints.length === 0) return null;
        return (
          <section key={section.status}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              {section.title}{' '}
              <span className="text-gray-400 dark:text-gray-600">
                · {sectionSprints.length}
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sectionSprints.map((sprint) => (
                <SprintCard
                  key={sprint._id}
                  sprint={sprint}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
