import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { generateAccessToken } from '../src/utils/jwt';

// Default strong password matches the registerSchema regex (upper / lower /
// digit / special char). Tests can override per-call when needed.
export const TEST_PASSWORD = 'Passw0rd!';

export interface TestUser {
  id: string;
  email: string;
  token: string;
  authHeader: string;
}

export const createTestUser = async (
  overrides: { name?: string; email?: string; password?: string } = {}
): Promise<TestUser> => {
  const suffix = new Types.ObjectId().toHexString().slice(-6);
  const user = await User.create({
    name: overrides.name ?? `Test ${suffix}`,
    email: overrides.email ?? `user-${suffix}@example.com`,
    password: overrides.password ?? TEST_PASSWORD,
  });

  const token = generateAccessToken({
    userId: user._id.toString(),
    email: user.email,
  });

  return {
    id: user._id.toString(),
    email: user.email,
    token,
    authHeader: `Bearer ${token}`,
  };
};

// Convenience helpers for time-bound sprints in tests.
export const inDays = (days: number, ref: Date = new Date()): string => {
  const d = new Date(ref);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
};
