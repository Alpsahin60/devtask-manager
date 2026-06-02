import { z } from 'zod';

// Single source of truth for task request bodies.
// Routes apply these via the validate middleware; controllers consume
// the inferred types and trust the already-validated req.body shape.

export const createTaskSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['todo', 'in-progress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  deadline: z.string().datetime({ offset: true }).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
