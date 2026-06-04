import { z } from 'zod';

// Single source of truth for sprint request bodies.
// Routes apply these via the validate middleware; controllers consume
// the inferred types and trust the already-validated req.body shape.
//
// Cross-field invariants (endDate > startDate, length <= 30 days,
// status-machine transitions) live in the service layer because they
// also have to hold for updates that touch only one of the dates.

const MAX_SPRINT_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const createSprintSchema = z
  .object({
    name: z.string().min(1, 'Sprint name is required').max(100, 'Sprint name too long'),
    goal: z.string().max(500, 'Sprint goal too long').optional(),
    startDate: z.string().datetime({ offset: true }),
    endDate: z.string().datetime({ offset: true }),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'Sprint end date must be after start date',
    path: ['endDate'],
  })
  .refine(
    (data) => {
      const diff = new Date(data.endDate).getTime() - new Date(data.startDate).getTime();
      return diff <= MAX_SPRINT_DAYS * MS_PER_DAY;
    },
    {
      message: `Sprint length cannot exceed ${MAX_SPRINT_DAYS} days`,
      path: ['endDate'],
    }
  );
export type CreateSprintInput = z.infer<typeof createSprintSchema>;

// Partial update — every field optional. Cross-field rules are re-checked
// against the persisted document in the service layer, because the request
// body alone does not contain the full picture.
export const updateSprintSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    goal: z.string().max(500).optional(),
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
    status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional(),
    reviewNotes: z.string().max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;

export const sprintListQuerySchema = z.object({
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional(),
});
export type SprintListQueryInput = z.infer<typeof sprintListQuerySchema>;
