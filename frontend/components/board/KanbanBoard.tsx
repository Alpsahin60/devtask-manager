'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useState } from 'react';
import { Task, TaskStatus } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

interface KanbanBoardProps {
  tasks: Task[];
  onMoveTask: (id: string, status: TaskStatus) => Promise<void>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => Promise<void>;
}

export const KanbanBoard = ({ tasks, onMoveTask, onEditTask, onDeleteTask }: KanbanBoardProps) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // PointerSensor with a small activation distance to prevent accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t._id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    // The droppable id is the column's status string
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t._id === active.id);

    if (task && task.status !== newStatus) {
      onMoveTask(task._id, newStatus);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={tasks.filter((t) => t.status === col.id)}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>

      {/* Drag overlay: renders the card while dragging */}
      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            onEdit={() => {}}
            onDelete={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};
