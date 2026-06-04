import { Response, NextFunction } from 'express';
import { RetroService } from '../services/RetroService';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorMiddleware';
import type {
  CreateRetroItemInput,
  UpdateRetroItemInput,
} from '../schemas/retroSchemas';

const requireUserId = (req: AuthRequest): string => {
  const id = req.user?.userId;
  if (!id) throw new AppError('Authentication required', 401);
  return id;
};

/**
 * GET /api/sprints/:id/retro
 * Returns retro items grouped by Mad / Sad / Glad.
 */
export const getRetroItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    const grouped = await RetroService.listGrouped(ownerId, req.params.id);
    res.status(200).json({
      success: true,
      message: 'Retro items retrieved successfully',
      data: grouped,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sprints/:id/retro
 */
export const createRetroItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    const data = req.body as CreateRetroItemInput;
    const item = await RetroService.create(ownerId, req.params.id, data);
    res.status(201).json({
      success: true,
      message: 'Retro item created successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/sprints/:id/retro/:itemId
 */
export const updateRetroItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    const data = req.body as UpdateRetroItemInput;
    const item = await RetroService.update(
      ownerId,
      req.params.id,
      req.params.itemId,
      data
    );
    res.status(200).json({
      success: true,
      message: 'Retro item updated successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/sprints/:id/retro/:itemId
 */
export const deleteRetroItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = requireUserId(req);
    await RetroService.remove(ownerId, req.params.id, req.params.itemId);
    res.status(200).json({
      success: true,
      message: 'Retro item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
