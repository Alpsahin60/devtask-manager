import { Request } from 'express';
import { SecurityEvent } from '../models/SecurityEvent';

export interface SecurityEventData {
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  eventType: 'login_success' | 'login_failure' | 'account_locked' | 'password_reset' | 'suspicious_activity' |
            'registration_success' | 'registration_failed' | 'registration_blocked' |
            'token_refresh_success' | 'token_refresh_failed' | 'token_refresh_blocked' |
            'logout_success' | 'admin_action';
  details?: any;
}

/**
 * Security Service for logging and monitoring security events
 */
export class SecurityService {
  /**
   * Log a security event to the database
   */
  static async logEvent(eventData: SecurityEventData): Promise<void> {
    try {
      await SecurityEvent.create({
        ...eventData,
        timestamp: new Date(),
      });
      
      // Also log to console for immediate visibility
      console.log(`[SECURITY] ${new Date().toISOString()} - ${eventData.eventType}: ${eventData.email || 'unknown'} from ${eventData.ipAddress}`);
      
      // In production, you might want to send to external monitoring service
      if (process.env.NODE_ENV === 'production' && eventData.eventType === 'suspicious_activity') {
        // TODO: Integration with monitoring services (e.g., Datadog, New Relic, etc.)
        console.warn(`[SECURITY ALERT] Suspicious activity detected: ${eventData.details}`);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - logging failure shouldn't break the app
    }
  }

  /**
   * Extract client information from Express request
   */
  static getClientInfo(req: Request): { ipAddress: string; userAgent?: string } {
    return {
      ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
    };
  }

  /**
   * Check for suspicious login patterns
   */
  static async checkSuspiciousActivity(email: string, ipAddress: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Check for multiple failed attempts from same IP
    const failedAttempts = await SecurityEvent.countDocuments({
      email,
      ipAddress,
      eventType: 'login_failure',
      timestamp: { $gte: oneHourAgo },
    });

    // Check for attempts from multiple IPs for same email
    const distinctIPs = await SecurityEvent.distinct('ipAddress', {
      email,
      eventType: 'login_failure',
      timestamp: { $gte: oneHourAgo },
    });

    const isSuspicious = failedAttempts >= 3 || distinctIPs.length >= 3;

    if (isSuspicious) {
      await this.logEvent({
        email,
        ipAddress,
        eventType: 'suspicious_activity',
        details: `Multiple failed login attempts: ${failedAttempts} attempts from ${distinctIPs.length} different IPs`,
      });
    }

    return isSuspicious;
  }

  /**
   * Get recent security events for a user
   */
  static async getUserSecurityEvents(userId: string, limit: number = 10) {
    return SecurityEvent.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('eventType ipAddress userAgent timestamp');
  }

  /**
   * Clean old security events (for GDPR compliance)
   */
  static async cleanOldEvents(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    const result = await SecurityEvent.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    console.log(`[SECURITY] Cleaned ${result.deletedCount} old security events`);
  }

  /**
   * Get recent security events for dashboard
   */
  static async getRecentSecurityEvents(limit: number = 10): Promise<any[]> {
    return await SecurityEvent.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get suspicious activities summary
   */
  static async getSuspiciousActivities(limit: number = 5): Promise<any[]> {
    const suspiciousEvents = await SecurityEvent.find({
      eventType: { $in: ['login_failed', 'account_locked', 'suspicious_activity'] }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

    return suspiciousEvents.map(event => ({
      id: event._id,
      type: event.eventType,
      email: event.email,
      ipAddress: event.ipAddress,
      timestamp: event.timestamp || new Date(),
      details: event.details
    }));
  }

  /**
   * Get security events with advanced filtering
   */
  static async getSecurityEventsWithFilter(filter: {
    userId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    ipAddress?: string;
    page: number;
    limit: number;
  }): Promise<any[]> {
    const query: any = {};

    if (filter.userId) query.userId = filter.userId;
    if (filter.eventType) query.eventType = filter.eventType;
    if (filter.ipAddress) query.ipAddress = filter.ipAddress;
    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) query.createdAt.$gte = filter.startDate;
      if (filter.endDate) query.createdAt.$lte = filter.endDate;
    }

    const skip = (filter.page - 1) * filter.limit;

    return await SecurityEvent.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(filter.limit)
      .lean();
  }

  /**
   * Get distinct users from security events
   */
  static async getDistinctUsersFromEvents(
    eventTypes: string[], 
    since: Date
  ): Promise<string[]> {
    const result = await SecurityEvent.distinct('userId', {
      eventType: { $in: eventTypes },
      createdAt: { $gte: since },
      userId: { $ne: null }
    });

    return result.map(id => id.toString());
  }

  /**
   * Get login trends for analytics
   */
  static async getLoginTrends(startDate: Date, endDate: Date): Promise<any[]> {
    const trends = await SecurityEvent.aggregate([
      {
        $match: {
          eventType: { $in: ['login_success', 'login_failed'] },
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    return trends;
  }

  /**
   * Get error trends for analytics
   */
  static async getErrorTrends(startDate: Date, endDate: Date): Promise<any[]> {
    const errorTypes = [
      'login_failed', 
      'token_refresh_failed', 
      'registration_failed',
      'account_locked'
    ];

    return await SecurityEvent.aggregate([
      {
        $match: {
          eventType: { $in: errorTypes },
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);
  }

  /**
   * Get top IP addresses for analytics
   */
  static async getTopIPs(
    startDate: Date, 
    endDate: Date, 
    limit: number = 10
  ): Promise<any[]> {
    return await SecurityEvent.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          ipAddress: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$ipAddress',
          count: { $sum: 1 },
          lastSeen: { $max: '$createdAt' },
          eventTypes: { $addToSet: '$eventType' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limit
      }
    ]);
  }

  /**
   * Get event type distribution for analytics
   */
  static async getEventDistribution(startDate: Date, endDate: Date): Promise<any[]> {
    return await SecurityEvent.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
  }

  /**
   * Clean up old security events (data retention)
   */
  static async cleanupOldEvents(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await SecurityEvent.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }

  /**
   * Get security event statistics
   */
  static async getEventStatistics(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalEvents, eventTypes, dailyStats] = await Promise.all([
      SecurityEvent.countDocuments({ createdAt: { $gte: startDate } }),
      SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ])
    ]);

    return {
      totalEvents,
      eventTypes,
      dailyStats,
      period: { days, startDate, endDate: new Date() }
    };
  }
}