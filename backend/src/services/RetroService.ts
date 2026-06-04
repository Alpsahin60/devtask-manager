import { Types } from 'mongoose';
import { RetroItem, IRetroItemDocument } from '../models/RetroItem';
import { Sprint } from '../models/Sprint';
import { AppError } from '../middleware/errorMiddleware';
import { RetroCategory } from '../types';
import type {
  CreateRetroItemInput,
  UpdateRetroItemInput,
} from '../schemas/retroSchemas';

// Retro items are grouped by category (mad / sad / glad). They can be created
// while the sprint is active or after it has been completed, but once the
// sprint is `completed` items become read-only (lessons-learned integrity).

const RETRO_CATEGORIES: RetroCategory[] = ['mad', 'sad', 'glad'];

export type GroupedRetro = Record<RetroCategory, IRetroItemDocument[]>;

export class RetroService {
  /**
   * Returns retro items for the sprint grouped by category. Empty categories
   * are still present in the response so the UI can render placeholders.
   */
  static async listGrouped(
    ownerId: string,
    sprintId: string
  ): Promise<GroupedRetro> {
    const sprint = await Sprint.findOne({ _id: sprintId, owner: ownerId }).select('_id');
    if (!sprint) {
      throw new AppError('Sprint not found', 404);
    }

    const items = await RetroItem.find({ owner: ownerId, sprintId }).sort({
      createdAt: -1,
    });

    const grouped: GroupedRetro = { mad: [], sad: [], glad: [] };
    for (const item of items) {
      grouped[item.category].push(item);
    }
    return grouped;
  }

  static async create(
    ownerId: string,
    sprintId: string,
    data: CreateRetroItemInput
  ): Promise<IRetroItemDocument> {
    const sprint = await Sprint.findOne({ _id: sprintId, owner: ownerId });
    if (!sprint) {
      throw new AppError('Sprint not found', 404);
    }
    if (sprint.status === 'cancelled') {
      throw new AppError(
        'Retro items cannot be added to a cancelled sprint',
        409
      );
    }
    if (sprint.status === 'completed') {
      throw new AppError(
        'Retro items cannot be added to a completed sprint',
        409
      );
    }
    if (sprint.status === 'planned') {
      throw new AppError(
        'Retro items can only be added once the sprint is active',
        409
      );
    }
    if (!RETRO_CATEGORIES.includes(data.category)) {
      // Defence in depth — Zod already validated the enum.
      throw new AppError('Invalid retro category', 422);
    }

    return RetroItem.create({
      owner: new Types.ObjectId(ownerId),
      sprintId: sprint._id,
      category: data.category,
      content: data.content,
    });
  }

  static async update(
    ownerId: string,
    sprintId: string,
    itemId: string,
    data: UpdateRetroItemInput
  ): Promise<IRetroItemDocument> {
    const sprint = await Sprint.findOne({ _id: sprintId, owner: ownerId });
    if (!sprint) {
      throw new AppError('Sprint not found', 404);
    }
    if (sprint.status !== 'active') {
      throw new AppError(
        'Retro items are read-only once the sprint is no longer active',
        409
      );
    }

    const item = await RetroItem.findOne({
      _id: itemId,
      sprintId: sprint._id,
      owner: ownerId,
    });
    if (!item) {
      throw new AppError('Retro item not found', 404);
    }

    if (data.category !== undefined) item.category = data.category;
    if (data.content !== undefined) item.content = data.content;
    await item.save();
    return item;
  }

  static async remove(
    ownerId: string,
    sprintId: string,
    itemId: string
  ): Promise<void> {
    const sprint = await Sprint.findOne({ _id: sprintId, owner: ownerId });
    if (!sprint) {
      throw new AppError('Sprint not found', 404);
    }
    if (sprint.status !== 'active') {
      throw new AppError(
        'Retro items can only be deleted while the sprint is active',
        409
      );
    }

    const item = await RetroItem.findOneAndDelete({
      _id: itemId,
      sprintId: sprint._id,
      owner: ownerId,
    });
    if (!item) {
      throw new AppError('Retro item not found', 404);
    }
  }
}
