export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// ─── Scrum Types ──────────────────────────────────────────────────────────────

export type SprintStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type RetroCategory = 'mad' | 'sad' | 'glad';

export interface Sprint {
  _id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  reviewNotes?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveSprintResponse {
  sprint: Sprint;
  daysRemaining: number;
}

export interface StandupEntry {
  _id: string;
  sprintId: string;
  owner: string;
  date: string;
  yesterday?: string;
  today?: string;
  blockers?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetroItem {
  _id: string;
  sprintId: string;
  owner: string;
  category: RetroCategory;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type RetroGrouped = Record<RetroCategory, RetroItem[]>;
