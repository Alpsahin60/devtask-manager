import mongoose, { Schema, Document, Types } from 'mongoose';
import { TaskStatus, TaskPriority } from '../types';

export interface ITaskDocument extends Document {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: Date;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'in-progress', 'done'] satisfies TaskStatus[],
        message: 'Status must be todo, in-progress, or done',
      },
      default: 'todo',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'] satisfies TaskPriority[],
        message: 'Priority must be low, medium, or high',
      },
      default: 'medium',
    },
    deadline: {
      type: Date,
    },
    // Each task belongs to exactly one user — this enables data isolation
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must have an owner'],
      index: true, // indexed for faster queries by owner
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: fast lookup of all tasks belonging to a user, sorted by creation
taskSchema.index({ owner: 1, createdAt: -1 });

export const Task = mongoose.model<ITaskDocument>('Task', taskSchema);
