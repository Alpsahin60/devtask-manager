import { Request } from 'express';
import { Types } from 'mongoose';

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
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
