import { z } from 'zod';

// Single source of truth for auth request bodies.
// Routes apply these via the validate middleware; controllers consume
// the inferred types and trust the already-validated req.body shape.

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    ),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;
