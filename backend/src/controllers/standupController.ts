import { Response, NextFunction } from 'express';
import { StandupService } from '../services/StandupService';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorMiddleware';
import type { UpsertStandupInput } from '../schemas/standupSchemas';

const requireUserId = (req: AuthRequest): string => {
  const id = req.user?.userId;
  if (!id) throw new AppError('Authentication required', 401);
  return id;
};

/**
 * GET /api/sprints/:id/standups
 */
export const getStandups = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    const entries = await StandupService.listForSprint(ownerId, req.params.id);
    res.status(200).json({
      success: true,
      message: 'Standup entries retrieved successfully',
      data: entries,
      total: entries.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/sprints/:id/standups
 * Upserts a single standup entry for the (owner, sprint, day) tuple.
 * Returns 200 (existing entry updated) or 201 (entry created).
 */
export const upsertStandup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    const data = req.body as UpsertStandupInput;
    const entry = await StandupService.upsert(ownerId, req.params.id, data);

    // findOneAndUpdate-with-upsert returns the persisted doc — we use createdAt
    // vs updatedAt to decide between 200 and 201 for accurate semantics.
    const created =
      entry.createdAt.getTime() === entry.updatedAt.getTime();
    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Standup entry created' : 'Standup entry updated',
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};
