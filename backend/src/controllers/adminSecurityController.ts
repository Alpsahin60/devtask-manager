import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SecurityService } from '../services/SecurityService';
import { TokenBlacklistService } from '../models/BlacklistedToken';
import { User } from '../models/User';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorMiddleware';

/**
 * Admin Security Controller
 * Provides endpoints for security monitoring, analytics, and management
 * Restricted to admin users only
 */

// ─── Validation Schemas ─────────────────────────────────────────────────────

const securityQuerySchema = z.object({
  userId: z.string().optional(),
  eventType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  ipAddress: z.string().optional(),
});

const blacklistQuerySchema = z.object({
  userId: z.string().optional(),
  tokenType: z.enum(['access', 'refresh']).optional(),
  reason: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const userActionSchema = z.object({
  userId: z.string(),
  action: z.enum(['unlock', 'lock', 'reset-attempts', 'force-logout']),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

// ─── Middleware ─────────────────────────────────────────────────────────────

/**
 * Middleware to ensure only admin users can access security endpoints
 */
export const requireAdmin = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.userId) {
      throw new AppError('Authentication required', 401);
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user has admin role (you may need to add this field to User model)
    // For now, checking if user is the first registered user or has admin email
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
    const isFirstUser = await User.countDocuments() === 1;
    const isAdminEmail = adminEmails.includes(user.email);
    
    if (!isFirstUser && !isAdminEmail) {
      throw new AppError('Admin access required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ─── Controllers ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/security/dashboard
 * Returns security dashboard overview with key metrics
 */
export const getSecurityDashboard = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      blacklistStats,
      recentEvents,
      suspiciousActivities,
      userStats
    ] = await Promise.all([
      TokenBlacklistService.getBlacklistStats(),
      SecurityService.getRecentSecurityEvents(10),
      SecurityService.getSuspiciousActivities(5),
      getUserSecurityStats()
    ]);

    const dashboard = {
      blacklist: blacklistStats,
      recentEvents: recentEvents.map(event => ({
        id: event._id,
        type: event.eventType,
        userId: event.userId,
        email: event.email,
        ipAddress: event.ipAddress,
        timestamp: event.createdAt,
        severity: getEventSeverity(event.eventType)
      })),
      suspiciousActivities,
      userStats,
      systemHealth: {
        totalUsers: await User.countDocuments(),
        activeUsers24h: await getActiveUsersCount(24),
        lockedAccounts: await User.countDocuments({ isLocked: true }),
        lastDataUpdate: new Date()
      }
    };

    res.status(200).json({
      success: true,
      message: 'Security dashboard retrieved',
      data: dashboard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/security/events
 * Returns paginated security events with filtering
 */
export const getSecurityEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = securityQuerySchema.parse(req.query);
    
    const events = await SecurityService.getSecurityEventsWithFilter({
      userId: query.userId,
      eventType: query.eventType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      ipAddress: query.ipAddress,
      page: query.page,
      limit: query.limit
    });

    res.status(200).json({
      success: true,
      message: 'Security events retrieved',
      data: events,
      pagination: {
        page: query.page,
        limit: query.limit,
        hasMore: events.length === query.limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/security/blacklist
 * Returns paginated blacklisted tokens with filtering
 */
export const getBlacklistedTokens = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = blacklistQuerySchema.parse(req.query);
    
    const tokens = await getBlacklistedTokensWithFilter(query);

    res.status(200).json({
      success: true,
      message: 'Blacklisted tokens retrieved',
      data: tokens,
      pagination: {
        page: query.page,
        limit: query.limit,
        hasMore: tokens.length === query.limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/security/user-action
 * Perform security actions on user accounts
 */
export const performUserAction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, action, reason } = userActionSchema.parse(req.body);
    const adminUserId = req.user?.userId;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new AppError('Target user not found', 404);
    }

    let result: any = {};

    switch (action) {
      case 'unlock':
        await targetUser.unlockAccount();
        result = { accountUnlocked: true };
        break;

      case 'lock':
        targetUser.isLocked = true;
        targetUser.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await targetUser.save();
        result = { accountLocked: true };
        break;

      case 'reset-attempts':
        await targetUser.resetLoginAttempts();
        result = { attemptsReset: true };
        break;

      case 'force-logout':
        const blacklistedCount = await TokenBlacklistService.blacklistAllUserTokens(
          userId, 
          'admin_revocation'
        );
        result = { tokensBlacklisted: blacklistedCount };
        break;

      default:
        throw new AppError('Invalid action', 400);
    }

    // Log admin action
    await SecurityService.logEvent({
      eventType: 'admin_action',
      userId: adminUserId || undefined,
      email: undefined,
      ipAddress: SecurityService.getClientInfo(req).ipAddress,
      userAgent: SecurityService.getClientInfo(req).userAgent,
      details: {
        action,
        targetUserId: userId,
        targetUserEmail: targetUser.email,
        reason,
        result
      }
    });

    res.status(200).json({
      success: true,
      message: `User action '${action}' performed successfully`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/security/analytics
 * Returns security analytics and trends
 */
export const getSecurityAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const analytics = await generateSecurityAnalytics(days);

    res.status(200).json({
      success: true,
      message: 'Security analytics retrieved',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Get user security statistics
 */
async function getUserSecurityStats(): Promise<any> {
  const totalUsers = await User.countDocuments();
  const lockedUsers = await User.countDocuments({ isLocked: true });
  const usersWithAttempts = await User.countDocuments({ loginAttempts: { $gt: 0 } });

  return {
    totalUsers,
    lockedUsers,
    usersWithAttempts,
    lockRate: totalUsers > 0 ? (lockedUsers / totalUsers * 100).toFixed(2) : 0
  };
}

/**
 * Get count of active users in the last N hours
 */
async function getActiveUsersCount(hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const activeUserEvents = await SecurityService.getDistinctUsersFromEvents([
    'login_success', 
    'token_refresh_success'
  ], since);
  
  return activeUserEvents.length;
}

/**
 * Get event severity level for dashboard display
 */
function getEventSeverity(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    login_success: 'low',
    logout_success: 'low',
    registration_success: 'low',
    token_refresh_success: 'low',
    login_failed: 'medium',
    token_refresh_failed: 'medium',
    registration_failed: 'medium',
    account_locked: 'high',
    suspicious_activity: 'high',
    registration_blocked: 'high',
    token_refresh_blocked: 'high',
    admin_action: 'critical',
  };

  return severityMap[eventType] || 'medium';
}

/**
 * Get blacklisted tokens with filtering
 */
async function getBlacklistedTokensWithFilter(query: any): Promise<any[]> {
  // This would be implemented with the BlacklistedToken model
  // For now, returning a placeholder
  return TokenBlacklistService.getUserBlacklistedTokens(
    query.userId || '', 
    query.limit
  );
}

/**
 * Generate security analytics for the dashboard
 */
async function generateSecurityAnalytics(days: number): Promise<any> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    loginTrends,
    errorTrends,
    topIPs,
    eventDistribution
  ] = await Promise.all([
    SecurityService.getLoginTrends(startDate, new Date()),
    SecurityService.getErrorTrends(startDate, new Date()),
    SecurityService.getTopIPs(startDate, new Date(), 10),
    SecurityService.getEventDistribution(startDate, new Date())
  ]);

  return {
    period: { days, startDate, endDate: new Date() },
    trends: {
      logins: loginTrends,
      errors: errorTrends
    },
    topIPs,
    eventDistribution
  };
}