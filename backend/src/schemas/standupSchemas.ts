import { z } from 'zod';

// Standup entries are written via upsert: a PUT with the same (sprint, date)
// tuple replaces the existing entry. The route uses validate(upsertStandupSchema)
// for body validation; the service layer normalises `date` to 00:00 UTC.

export const upsertStandupSchema = z.object({
  date: z.string().datetime({ offset: true }),
  yesterday: z.string().max(500, 'Yesterday note too long').optional(),
  today: z.string().max(500, 'Today note too long').optional(),
  blockers: z.string().max(500, 'Blockers note too long').optional(),
});
export type UpsertStandupInput = z.infer<typeof upsertStandupSchema>;
