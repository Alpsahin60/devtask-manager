import { z } from 'zod';

// Single source of truth for admin request payloads.
// Body schemas are applied via validate(schema); query schemas via
// validate(schema, 'query'). Controllers consume the inferred types
// from req.body / req.query without re-parsing.

export const userActionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  action: z.enum(['unlock', 'lock', 'reset-attempts', 'force-logout']),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});
export type UserActionInput = z.infer<typeof userActionSchema>;

export const securityQuerySchema = z.object({
  userId: z.string().optional(),
  eventType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  ipAddress: z.string().optional(),
});
export type SecurityQueryInput = z.infer<typeof securityQuerySchema>;

export const blacklistQuerySchema = z.object({
  userId: z.string().optional(),
  tokenType: z.enum(['access', 'refresh']).optional(),
  reason: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
export type BlacklistQueryInput = z.infer<typeof blacklistQuerySchema>;

// Preserves the previous controller behaviour ("parseInt(days) || 7"):
// any invalid or missing input falls back to 7 instead of producing a 400.
export const securityAnalyticsQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).catch(7).default(7),
});
export type SecurityAnalyticsQueryInput = z.infer<typeof securityAnalyticsQuerySchema>;
