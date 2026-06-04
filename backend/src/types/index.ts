import { Request } from 'express';
import { Types } from 'mongoose';

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  isDemo?: boolean;
}

// Extends Express Request to carry the authenticated user after JWT verification
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── User Types ───────────────────────────────────────────────────────────────

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Task Types ───────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface ITask {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: Date;
  owner: Types.ObjectId; // reference to User
  createdAt: Date;
  updatedAt: Date;
}

// ─── Scrum Types ──────────────────────────────────────────────────────────────

export type SprintStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type RetroCategory = 'mad' | 'sad' | 'glad';

export interface ISprint {
  _id: Types.ObjectId;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  reviewNotes?: string;
  owner: Types.ObjectId; // reference to User
  createdAt: Date;
  updatedAt: Date;
}

export interface IStandupEntry {
  _id: Types.ObjectId;
  sprintId: Types.ObjectId; // reference to Sprint
  owner: Types.ObjectId;    // denormalised for direct owner-isolation queries
  date: Date;               // normalised to 00:00 UTC by the service layer
  yesterday?: string;
  today?: string;
  blockers?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRetroItem {
  _id: Types.ObjectId;
  sprintId: Types.ObjectId; // reference to Sprint
  owner: Types.ObjectId;    // denormalised for direct owner-isolation queries
  category: RetroCategory;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
