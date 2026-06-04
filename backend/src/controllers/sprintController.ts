import { Response, NextFunction } from 'express';
import { SprintService } from '../services/SprintService';
import { AuthRequest, SprintStatus } from '../types';
import { AppError } from '../middleware/errorMiddleware';
import type {
  CreateSprintInput,
  UpdateSprintInput,
  SprintListQueryInput,
} from '../schemas/sprintSchemas';

// Validation schemas live in schemas/sprintSchemas.ts — single source of truth.
// Routes apply them via validate(); controllers consume the inferred types
// and trust the already-validated req.body / req.query.

const requireUserId = (req: AuthRequest): string => {
  const id = req.user?.userId;
  if (!id) throw new AppError('Authentication required', 401);
  return id;
};

/**
 * GET /api/sprints
 * Returns every sprint owned by the authenticated user. Supports ?status=.
 */
export const getSprints = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    const { status } = req.query as SprintListQueryInput;
    const sprints = await SprintService.list(ownerId, status as SprintStatus | undefined);
    res.status(200).json({
      success: true,
      message: 'Sprints retrieved successfully',
      data: sprints,
      total: sprints.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sprints/active
 * Returns the currently active sprint plus `daysRemaining` (US-4).
 * Returns 200 with `data: null` if no active sprint exists.
 */
export const getActiveSprint = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    const result = await SprintService.getActive(ownerId);
    res.status(200).json({
      success: true,
      message: result ? 'Active sprint retrieved' : 'No active sprint',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sprints/:id
 */
export const getSprintById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    const sprint = await SprintService.getById(ownerId, req.params.id);
    res.status(200).json({
      success: true,
      message: 'Sprint retrieved successfully',
      data: sprint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sprints
 */
export const createSprint = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    const data = req.body as CreateSprintInput;
    const sprint = await SprintService.create(ownerId, data);
    res.status(201).json({
      success: true,
      message: 'Sprint created successfully',
      data: sprint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/sprints/:id
 */
export const updateSprint = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    const data = req.body as UpdateSprintInput;
    const sprint = await SprintService.update(ownerId, req.params.id, data);
    res.status(200).json({
      success: true,
      message: 'Sprint updated successfully',
      data: sprint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/sprints/:id
 * Deletes the sprint and cascades to its standup entries and retro items.
 */
export const deleteSprint = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    await SprintService.remove(ownerId, req.params.id);
    res.status(200).json({
      success: true,
      message: 'Sprint deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
