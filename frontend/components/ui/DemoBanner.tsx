'use client';

import { useAuth } from '@/hooks/useAuth';

// Sticky banner that signals the demo session to recruiters. Renders only
// when the authenticated user carries the isDemo flag.
export const DemoBanner = () => {
  const { user } = useAuth();
  if (!user?.isDemo) return null;

  return (
    <div className="sticky top-0 z-40 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
      <div className="max-w-7xl mx-auto px-6 py-2 text-xs sm:text-sm flex items-center justify-between gap-3">
        <span>
          <span className="font-semibold">Demo-Modus aktiv.</span>{' '}
          Read-only Showcase mit gestellten Daten. Schreibende Aktionen sind gesperrt.
        </span>
        <span className="hidden sm:inline text-amber-700/80 dark:text-amber-300/80">
          {user.email}
        </span>
      </div>
    </div>
  );
};
