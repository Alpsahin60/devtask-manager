import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  getTokenExpiration 
} from '../utils/jwt';
import { AppError } from '../middleware/errorMiddleware';
import { SecurityService } from '../services/SecurityService';
import { TokenBlacklistService } from '../models/BlacklistedToken';
import { AuthRequest } from '../types';

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// ─── Cookie Helper ────────────────────────────────────────────────────────────

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,       // not accessible via JS — protects against XSS
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict' as const, // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth',   // cookie only sent to auth endpoints
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates a new user account with enhanced security logging.
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body as z.infer<typeof registerSchema>;
    const clientInfo = SecurityService.getClientInfo(req);

    // Check for suspicious registration activity
    const isSuspicious = await SecurityService.checkSuspiciousActivity(email, clientInfo.ipAddress);
    if (isSuspicious) {
      await SecurityService.logEvent({
        eventType: 'registration_blocked',
        userId: undefined,
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        details: { reason: 'Suspicious activity detected' }
      });
      throw new AppError('Suspicious activity detected. Please try again later.', 429);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await SecurityService.logEvent({
        eventType: 'registration_failed',
        userId: undefined,
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        details: { reason: 'Email already exists' }
      });
      throw new AppError('Email already in use', 409);
    }

    const user = await User.create({ name, email, password });

    const payload = { userId: user._id.toString(), email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Log successful registration
    await SecurityService.logEvent({
      eventType: 'registration_success',
      userId: user._id.toString(),
      email: user.email,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      details: { registrationTime: new Date() }
    });

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: { id: user._id, name: user.name, email: user.email },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticates user credentials and issues JWT tokens with enhanced security.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const clientInfo = SecurityService.getClientInfo(req);

    // Check for suspicious activity first
    const isSuspicious = await SecurityService.checkSuspiciousActivity(email, clientInfo.ipAddress);
    if (isSuspicious) {
      throw new AppError('Suspicious activity detected. Please try again later.', 429);
    }

    // Explicitly select password and security fields
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockedUntil +isLocked');
    
    if (!user) {
      // Log failed attempt even for non-existent users (prevents user enumeration detection)
      await SecurityService.logEvent({
        email,
        ...clientInfo,
        eventType: 'login_failure',
        details: 'Invalid email',
      });
      throw new AppError('Invalid email or password', 401);
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      await SecurityService.logEvent({
        userId: user._id.toString(),
        email,
        ...clientInfo,
        eventType: 'login_failure',
        details: 'Account locked',
      });
      throw new AppError('Account is temporarily locked due to multiple failed login attempts. Please try again later.', 423);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed login attempts
      await user.incLoginAttempts();
      
      // Check if account got locked after this attempt
      const isNowLocked = user.loginAttempts + 1 >= 5;
      
      await SecurityService.logEvent({
        userId: user._id.toString(),
        email,
        ...clientInfo,
        eventType: isNowLocked ? 'account_locked' : 'login_failure',
        details: isNowLocked ? 'Account locked after max attempts' : `Failed attempt #${user.loginAttempts + 1}`,
      });

      throw new AppError(
        isNowLocked 
          ? 'Account has been locked due to multiple failed login attempts. Please try again in 15 minutes.' 
          : 'Invalid email or password', 
        401
      );
    }

    // Successful login - reset login attempts
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Log successful login
    await SecurityService.logEvent({
      userId: user._id.toString(),
      email,
      ...clientInfo,
      eventType: 'login_success',
    });

    const payload = { userId: user._id.toString(), email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email,
          twoFactorEnabled: user.twoFactorEnabled 
        },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Issues a new access token using the httpOnly refresh token cookie with security logging.
 */
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    const clientInfo = SecurityService.getClientInfo(req);

    if (!token) {
      await SecurityService.logEvent({
        eventType: 'token_refresh_failed',
        userId: undefined,
        email: undefined,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        details: { reason: 'No refresh token provided' }
      });
      throw new AppError('No refresh token provided', 401);
    }

    try {
      const decoded = await verifyRefreshToken(token);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        await SecurityService.logEvent({
          eventType: 'token_refresh_failed',
          userId: decoded.userId,
          email: undefined,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          details: { reason: 'User not found' }
        });
        throw new AppError('User not found', 401);
      }

      // Check for suspicious activity first
      const isSuspicious = await SecurityService.checkSuspiciousActivity(user.email, clientInfo.ipAddress);
      if (isSuspicious) {
        await SecurityService.logEvent({
          eventType: 'token_refresh_blocked',
          userId: user._id.toString(),
          email: user.email,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          details: { reason: 'Suspicious activity detected' }
        });
        throw new AppError('Suspicious activity detected. Please try again later.', 429);
      }

      const payload = { userId: user._id.toString(), email: user.email };
      const accessToken = generateAccessToken(payload);

      // Log successful token refresh
      await SecurityService.logEvent({
        eventType: 'token_refresh_success',
        userId: user._id.toString(),
        email: user.email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        details: { refreshTime: new Date() }
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed',
        data: { accessToken },
      });
    } catch (tokenError: any) {
      await SecurityService.logEvent({
        eventType: 'token_refresh_failed',
        userId: undefined,
        email: undefined,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        details: { reason: 'Invalid refresh token', error: tokenError.message }
      });
      throw new AppError('Invalid refresh token', 401);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Clears the refresh token cookie and blacklists the token with security logging.
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientInfo = SecurityService.getClientInfo(req);
    const refreshToken = req.cookies?.refreshToken;
    let userId = null;
    let userEmail = null;

    // Try to get user info from refresh token if available
    if (refreshToken) {
      try {
        const decoded = await verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.userId);
        if (user) {
          userId = user._id.toString();
          userEmail = user.email;

          // Get token expiration date
          const tokenExpiration = getTokenExpiration(refreshToken);

          // Blacklist the refresh token
          await TokenBlacklistService.blacklistToken(
            refreshToken,
            'refresh',
            userId,
            'logout',
            tokenExpiration
          );

          // Also try to blacklist access token from Authorization header if present
          const authHeader = req.headers.authorization;
          if (authHeader?.startsWith('Bearer ')) {
            const accessToken = authHeader.split(' ')[1];
            try {
              const accessTokenExpiration = getTokenExpiration(accessToken);
              await TokenBlacklistService.blacklistToken(
                accessToken,
                'access',
                userId,
                'logout',
                accessTokenExpiration
              );
            } catch {
              // Access token might be invalid, but that's okay for logout
            }
          }
        }
      } catch (tokenError) {
        // Token invalid or expired, but still proceed with logout
        console.warn('Invalid refresh token during logout:', tokenError);
      }
    }

    // Log logout event
    await SecurityService.logEvent({
      eventType: 'logout_success',
      userId: userId || undefined,
      email: userEmail || undefined,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      details: { 
        logoutTime: new Date(),
        tokenBlacklisted: !!refreshToken
      }
    });

    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Even if blacklisting or logging fails, we should still log out the user
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'User profile retrieved',
      data: { user: { id: user._id, name: user.name, email: user.email } },
    });
  } catch (error) {
    next(error);
  }
};
