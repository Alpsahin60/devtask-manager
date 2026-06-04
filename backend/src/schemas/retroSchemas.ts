import { z } from 'zod';

// Retro items follow Mad / Sad / Glad — one of the three categories is required.
// Content is the free-text description (1-500 chars). After the sprint is
// completed retro items become read-only; that rule is enforced in the service.

export const createRetroItemSchema = z.object({
  category: z.enum(['mad', 'sad', 'glad']),
  content: z
    .string()
    .min(1, 'Retro item content is required')
    .max(500, 'Retro item content too long'),
});
export type CreateRetroItemInput = z.infer<typeof createRetroItemSchema>;

export const updateRetroItemSchema = z
  .object({
    category: z.enum(['mad', 'sad', 'glad']).optional(),
    content: z.string().min(1).max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateRetroItemInput = z.infer<typeof updateRetroItemSchema>;
