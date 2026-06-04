import { Types } from 'mongoose';
import { StandupEntry, IStandupEntryDocument } from '../models/StandupEntry';
import { Sprint } from '../models/Sprint';
import { AppError } from '../middleware/errorMiddleware';
import type { UpsertStandupInput } from '../schemas/standupSchemas';

// Standup entries are limited to the sprint's active phase and to a single
// entry per calendar day. The service normalises `date` to 00:00:00 UTC so
// the unique compound index (owner, sprintId, date) behaves predictably.

const normaliseToUtcDay = (raw: string | Date): Date => {
  const d = raw instanceof Date ? raw : new Date(raw);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const isWithinSprint = (date: Date, start: Date, end: Date): boolean => {
  const startDay = normaliseToUtcDay(start);
  const endDay = normaliseToUtcDay(end);
  return date.getTime() >= startDay.getTime() && date.getTime() <= endDay.getTime();
};

export class StandupService {
  static async listForSprint(
    ownerId: string,
    sprintId: string
  ): Promise<IStandupEntryDocument[]> {
    // Owner filter is on the standup itself — no Sprint lookup needed.
    // Verify the sprint belongs to the user, otherwise leak existence.
    const sprint = await Sprint.findOne({ _id: sprintId, owner: ownerId }).select('_id');
    if (!sprint) {
      throw new AppError('Sprint not found', 404);
    }
    return StandupEntry.find({ owner: ownerId, sprintId }).sort({ date: 1 });
  }

  /**
   * Upsert semantics: PUT-ing twice on the same (owner, sprint, day) replaces
   * the previous entry's fields rather than creating a duplicate. The unique
   * index on (owner, sprintId, date) catches any race condition.
   */
  static async upsert(
    ownerId: string,
    sprintId: string,
    data: UpsertStandupInput
  ): Promise<IStandupEntryDocument> {
    const sprint = await Sprint.findOne({ _id: sprintId, owner: ownerId });
    if (!sprint) {
      throw new AppError('Sprint not found', 404);
    }
    if (sprint.status !== 'active') {
      throw new AppError(
        'Standup entries can only be added to an active sprint',
        409
      );
    }

    const date = normaliseToUtcDay(data.date);
    if (!isWithinSprint(date, sprint.startDate, sprint.endDate)) {
      throw new AppError(
        'Standup date must lie within the sprint window',
        422
      );
    }

    const update: Record<string, unknown> = {
      owner: new Types.ObjectId(ownerId),
      sprintId: sprint._id,
      date,
    };
    // Allow callers to clear a field by sending an empty string.
    if (data.yesterday !== undefined) update.yesterday = data.yesterday;
    if (data.today !== undefined) update.today = data.today;
    if (data.blockers !== undefined) update.blockers = data.blockers;

    const entry = await StandupEntry.findOneAndUpdate(
      { owner: ownerId, sprintId: sprint._id, date },
      { $set: update },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return entry;
  }
}
