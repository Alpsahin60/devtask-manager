'use client';

import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { TaskModal } from '@/components/board/TaskModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { useState, useEffect } from 'react';
import { Task } from '@/types';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const { tasks, isLoading: tasksLoading, error, createTask, updateTask, deleteTask, moveTask } = useTasks();
  
  // Alle useState Hooks MÜSSEN vor jeder bedingten Rückgabe stehen
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // Bedingte Rückgabe NACH allen Hooks
  if (isLoading || !user) {
    return <LoadingPage message="Loading dashboard..." />;
  }

  const handleCreateTask = async (data: Partial<Task>) => {
    await createTask(data);
    setModalOpen(false);
  };

  const handleUpdateTask = async (data: Partial<Task>) => {
    if (editingTask) {
      await updateTask(editingTask._id, data);
      setEditingTask(null);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">DevTask Manager</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {user?.name}
            </span>
            <ThemeToggle />
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              + New Task
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

      {/* Board */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          {tasksLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <KanbanBoard
              tasks={tasks}
              onMoveTask={moveTask}
              onEditTask={handleEditTask}
              onDeleteTask={deleteTask}
            />
          )}
        </div>
      </main>

      {/* Create Modal */}
      {modalOpen && (
        <TaskModal
          onSubmit={handleCreateTask}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Edit Modal */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          onSubmit={handleUpdateTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
