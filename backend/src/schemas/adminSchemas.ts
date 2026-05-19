import { z } from 'zod';

// Schema for POST /api/admin/security/user-action body
// Note: the route message ("User ID is required", "...at least 5 characters") is more specific
// than the previous controller-internal variant. Single source of truth.
export const userActionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  action: z.enum(['unlock', 'lock', 'reset-attempts', 'force-logout']),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});
export type UserActionInput = z.infer<typeof userActionSchema>;
