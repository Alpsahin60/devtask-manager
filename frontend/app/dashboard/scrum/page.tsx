'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSprints } from '@/hooks/useSprints';
import { useToast } from '@/hooks/useToast';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SprintList } from '@/components/scrum/SprintList';
import { SprintModal } from '@/components/scrum/SprintModal';
import { SprintCountdown } from '@/components/scrum/SprintCountdown';
import { CreateSprintPayload } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiError';

export default function ScrumPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { sprints, isLoading, error, createSprint, deleteSprint } = useSprints();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return <LoadingPage message="Scrum-Bereich wird geladen..." />;
  }

  const activeSprint = sprints.find((s) => s.status === 'active');

  const handleCreate = async (payload: CreateSprintPayload) => {
    try {
      const sprint = await createSprint(payload);
      toast.success('Sprint angelegt.');
      setModalOpen(false);
      router.push(`/dashboard/scrum/${sprint._id}`);
    } catch (err) {
      // Re-throw so the modal shows the inline error; the modal already
      // formats the message via getApiErrorMessage on Error instances.
      throw new Error(getApiErrorMessage(err, 'Sprint konnte nicht angelegt werden'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Sprint und alle zugehoerigen Standups/Retro-Items wirklich loeschen?')) {
      return;
    }
    try {
      await deleteSprint(id);
      toast.success('Sprint geloescht.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Sprint konnte nicht geloescht werden'));
    }
  };

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
              <span className="font-medium text-gray-900 dark:text-white">Scrum</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
              {user?.name}
            </span>
            <ThemeToggle />
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              + Neuer Sprint
            </button>
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
        <div className="max-w-7xl mx-auto space-y-6">
          {activeSprint && <SprintCountdown sprint={activeSprint} />}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <SprintList sprints={sprints} onDelete={handleDelete} />
          )}
        </div>
      </main>

      {modalOpen && (
        <SprintModal
          onSubmit={handleCreate}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
