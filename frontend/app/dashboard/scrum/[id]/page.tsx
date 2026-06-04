'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSprintDetail } from '@/hooks/useSprintDetail';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SprintStatusBadge } from '@/components/scrum/SprintStatusBadge';
import { SprintCountdown } from '@/components/scrum/SprintCountdown';
import { SprintStatusControls } from '@/components/scrum/SprintStatusControls';
import { StandupSection } from '@/components/scrum/StandupSection';
import { RetroBoard } from '@/components/scrum/RetroBoard';
import { ReviewNotes } from '@/components/scrum/ReviewNotes';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('de-CH');

export default function SprintDetailPage() {
  const params = useParams<{ id: string }>();
  const sprintId = typeof params?.id === 'string' ? params.id : null;
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const { sprint, isLoading, error, updateSprint } = useSprintDetail(sprintId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return <LoadingPage message="Sprint wird geladen..." />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              DevTask Manager
            </h1>
            <nav className="hidden sm:flex items-center gap-3 text-sm">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
              >
                Tasks
              </Link>
              <span className="text-gray-300 dark:text-gray-700">/</span>
              <Link
                href="/dashboard/scrum"
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
              >
                Scrum
              </Link>
              <span className="text-gray-300 dark:text-gray-700">/</span>
              <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                {sprint?.name ?? 'Sprint'}
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          ) : !sprint ? (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sprint nicht gefunden oder kein Zugriff.
              </p>
              <Link
                href="/dashboard/scrum"
                className="mt-3 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Zurueck zur Sprint-Uebersicht
              </Link>
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {sprint.name}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                    </p>
                  </div>
                  <SprintStatusBadge status={sprint.status} />
                </div>

                {sprint.goal && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Sprint-Ziel
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {sprint.goal}
                    </p>
                  </div>
                )}

                {sprint.status === 'active' && <SprintCountdown sprint={sprint} />}

                <SprintStatusControls sprint={sprint} onUpdate={updateSprint} />
              </section>

              <ReviewNotes sprint={sprint} />

              <StandupSection sprint={sprint} />

              <RetroBoard sprint={sprint} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
