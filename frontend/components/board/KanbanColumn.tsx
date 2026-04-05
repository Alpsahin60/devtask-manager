'use client';

import { useDroppable } from '@dnd-kit/core';
import { Task, TaskStatus } from '@/types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  id: TaskStatus;
  label: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => Promise<void>;
}

const COLUMN_STYLES: Record<TaskStatus, string> = {
  'todo': 'border-t-gray-400',
  'in-progress': 'border-t-blue-500',
  'done': 'border-t-green-500',
};

export const KanbanColumn = ({ id, label, tasks, onEditTask, onDeleteTask }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border-t-4 ${COLUMN_STYLES[id]} bg-gray-100 dark:bg-gray-800/50 transition-colors ${
        isOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-semibold text-gray-700 dark:text-gray-300">{label}</h2>
        <span className="text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-3 p-3 min-h-[200px]">
        {tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task._id)}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-4">
            Drop tasks here
          </p>
        )}
      </div>
    </div>
  );
};
