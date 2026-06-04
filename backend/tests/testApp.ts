import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from '../src/middleware/errorMiddleware';
import authRoutes from '../src/routes/authRoutes';
import sprintRoutes from '../src/routes/sprintRoutes';

// Test-only app factory — mirrors the route mounting in src/index.ts but
// without the global security middleware (rate limiting, CSP, HTTPS enforcer)
// so the tests can exercise the controllers under deterministic conditions.
export const buildTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', authRoutes);
  app.use('/api/sprints', sprintRoutes);

  app.use(errorHandler);
  return app;
};
