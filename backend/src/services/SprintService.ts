import { Types } from 'mongoose';
import { Sprint, ISprintDocument } from '../models/Sprint';
import { StandupEntry } from '../models/StandupEntry';
import { RetroItem } from '../models/RetroItem';
import { AppError } from '../middleware/errorMiddleware';
import { SprintStatus } from '../types';
import type { CreateSprintInput, UpdateSprintInput } from '../schemas/sprintSchemas';

// Sprint business rules live here so controllers stay thin.
// Key invariants enforced:
//   - status machine: planned → active → completed; planned → cancelled; active → cancelled.
//   - at most one active sprint per owner at a time.
//   - completed / cancelled sprints are read-only.
//   - startDate may only be changed while the sprint is still `planned`.
//   - reviewNotes can only be set during the active → completed transition.
//   - deleting a sprint cascades to its standup entries and retro items.

const MAX_SPRINT_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ALLOWED_TRANSITIONS: Record<SprintStatus, SprintStatus[]> = {
  planned: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const isTerminalStatus = (status: SprintStatus): boolean =>
  status === 'completed' || status === 'cancelled';

const isTransitionAllowed = (from: SprintStatus, to: SprintStatus): boolean =>
  from === to || ALLOWED_TRANSITIONS[from].includes(to);

export class SprintService {
  static async list(
    ownerId: string,
    status?: SprintStatus
  ): Promise<ISprintDocument[]> {
    const filter: Record<string, unknown> = { owner: ownerId };
    if (status) filter.status = status;
    return Sprint.find(filter).sort({ startDate: -1 });
  }

  static async getById(ownerId: string, sprintId: string): Promise<ISprintDocument> {
    const sprint = await Sprint.findOne({ _id: sprintId, owner: ownerId });
    if (!sprint) {
      throw new AppError('Sprint not found', 404);
    }
    return sprint;
  }

  /**
   * Returns the user's currently active sprint plus a `daysRemaining`
   * countdown for US-4. Returns null if no active sprint exists.
   */
  static async getActive(ownerId: string): Promise<{
    sprint: ISprintDocument;
    daysRemaining: number;
  } | null> {
    const sprint = await Sprint.findOne({ owner: ownerId, status: 'active' });
    if (!sprint) return null;

    const now = Date.now();
    const diffMs = sprint.endDate.getTime() - now;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / MS_PER_DAY));
    return { sprint, daysRemaining };
  }

  static async create(
    ownerId: string,
    data: CreateSprintInput
  ): Promise<ISprintDocument> {
    return Sprint.create({
      name: data.name,
      goal: data.goal,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: 'planned',
      owner: new Types.ObjectId(ownerId),
    });
  }

  static async update(
    ownerId: string,
    sprintId: string,
    data: UpdateSprintInput
  ): Promise<ISprintDocument> {
    const sprint = await this.getById(ownerId, sprintId);

    if (isTerminalStatus(sprint.status) && data.status !== sprint.status) {
      throw new AppError(
        `Sprint is ${sprint.status} and cannot be modified`,
        409
      );
    }

    // startDate is only editable in the `planned` state. Other read-only-ish
    // checks (terminal status) already returned above.
    if (data.startDate !== undefined && sprint.status !== 'planned') {
      throw new AppError(
        'Sprint start date can only be changed while the sprint is planned',
        409
      );
    }

    // Status transition gate.
    if (data.status && data.status !== sprint.status) {
      if (!isTransitionAllowed(sprint.status, data.status)) {
        throw new AppError(
          `Invalid status transition: ${sprint.status} -> ${data.status}`,
          409
        );
      }
      if (data.status === 'active') {
        const conflict = await Sprint.findOne({
          owner: ownerId,
          status: 'active',
          _id: { $ne: sprint._id },
        });
        if (conflict) {
          throw new AppError(
            'Another sprint is already active — finish or cancel it first',
            409
          );
        }
      }
    }

    // reviewNotes can only be set when transitioning active → completed.
    if (data.reviewNotes !== undefined) {
      const finishing = sprint.status === 'active' && data.status === 'completed';
      if (!finishing) {
        throw new AppError(
          'Review notes can only be set when completing an active sprint',
          409
        );
      }
    }

    if (data.name !== undefined) sprint.name = data.name;
    if (data.goal !== undefined) sprint.goal = data.goal;
    if (data.startDate !== undefined) sprint.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) sprint.endDate = new Date(data.endDate);
    if (data.reviewNotes !== undefined) sprint.reviewNotes = data.reviewNotes;
    if (data.status) sprint.status = data.status;

    // Re-check date invariants when either endpoint moved.
    if (data.startDate !== undefined || data.endDate !== undefined) {
      if (sprint.endDate <= sprint.startDate) {
        throw new AppError('Sprint end date must be after start date', 422);
      }
      const diff = sprint.endDate.getTime() - sprint.startDate.getTime();
      if (diff > MAX_SPRINT_DAYS * MS_PER_DAY) {
        throw new AppError(
          `Sprint length cannot exceed ${MAX_SPRINT_DAYS} days`,
          422
        );
      }
    }

    await sprint.save();
    return sprint;
  }

  /**
   * Hard-deletes the sprint and cascades to standup entries and retro items.
   * Mongo handles concurrency at row-level — we wrap the three deletes so a
   * partial failure throws and the caller sees an error rather than silent
   * orphans.
   */
  static async remove(ownerId: string, sprintId: string): Promise<void> {
    const sprint = await this.getById(ownerId, sprintId);

    await Promise.all([
      StandupEntry.deleteMany({ owner: ownerId, sprintId: sprint._id }),
      RetroItem.deleteMany({ owner: ownerId, sprintId: sprint._id }),
    ]);
    await sprint.deleteOne();
  }
}
