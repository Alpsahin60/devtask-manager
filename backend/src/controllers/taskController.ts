import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { Task } from '../models/Task';
import { AppError } from '../middleware/errorMiddleware';
import { AuthRequest } from '../types';

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['todo', 'in-progress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  deadline: z.string().datetime({ offset: true }).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/tasks
 * Returns all tasks owned by the authenticated user.
 * Supports optional ?status= and ?priority= query filters.
 */
export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, priority } = req.query;

    // Build filter dynamically — only include defined query params
    const filter: Record<string, unknown> = { owner: req.user?.userId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: tasks,
      total: tasks.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/:id
 * Returns a single task. Only accessible by the task's owner.
 */
export const getTaskById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.user?.userId });
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Task retrieved successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tasks
 * Creates a new task for the authenticated user.
 */
export const createTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as z.infer<typeof createTaskSchema>;

    const task = await Task.create({
      ...data,
      owner: req.user?.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tasks/:id
 * Partially updates a task. Only the owner can update their tasks.
 * PATCH is used instead of PUT because we support partial updates.
 */
export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as z.infer<typeof updateTaskSchema>;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, owner: req.user?.userId },
      data,
      { new: true, runValidators: true } // return updated doc, run schema validators
    );

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tasks/:id
 * Permanently deletes a task. Only the owner can delete their tasks.
 */
export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user?.userId });
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
