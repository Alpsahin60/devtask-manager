import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError } from './errorMiddleware';

/**
 * Blocks write operations for demo accounts. The recruiter-facing showcase
 * is read-only by contract — the seed runs in a fixed shape and any edit
 * would either pollute the demo or leak between users. The `isDemo` flag
 * is part of the JWT payload, so the check stays at the edge without a DB
 * round-trip.
 *
 * Apply after `protect` and before any controller that mutates data.
 */
export const requireNotDemo = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (req.user?.isDemo) {
    return next(
      new AppError(
        'Demo-Account: schreibende Aktionen sind in diesem Modus gesperrt.',
        403
      )
    );
  }
  next();
};
