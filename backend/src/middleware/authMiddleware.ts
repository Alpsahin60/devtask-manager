import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthRequest } from '../types';
import { AppError } from './errorMiddleware';

/**
 * Protects routes by verifying the JWT access token with blacklist checking.
 *
 * Token lookup order:
 * 1. Authorization header: "Bearer <token>"
 * 2. httpOnly cookie: "accessToken"
 *
 * On success, attaches the decoded payload to req.user so controllers
 * can identify the requesting user without another DB call.
 */
export const protect = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Fall back to httpOnly cookie
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken as string;
    }

    if (!token) {
      throw new AppError('Authentication required — no token provided', 401);
    }

    // Enhanced verification with blacklist checking
    const decoded = await verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    // Handle token revocation errors
    if (error.message === 'Token has been revoked') {
      next(new AppError('Authentication failed — token has been revoked', 401));
    } else {
      next(error);
    }
  }
};
