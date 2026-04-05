import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Interface for JWT Token Blacklist documents
 */
export interface IBlacklistedToken extends Document {
  token: string;          // The blacklisted JWT token
  tokenType: 'access' | 'refresh';  // Type of token
  userId: string;         // User ID associated with the token
  reason: string;         // Reason for blacklisting
  expiresAt: Date;        // When the token naturally expires
  blacklistedAt: Date;    // When the token was blacklisted
}

/**
 * Interface for static methods
 */
interface IBlacklistedTokenModel extends Model<IBlacklistedToken> {
  addToBlacklist(token: string, tokenType: 'access' | 'refresh', userId: string, reason: string, expiresAt: Date): Promise<IBlacklistedToken>;
  isBlacklisted(token: string): Promise<boolean>;
  blacklistUserTokens(userId: string, tokenType?: 'access' | 'refresh', reason?: string): Promise<number>;
  cleanupExpired(): Promise<number>;
}

/**
 * Schema for blacklisted JWT tokens
 * Used to maintain a list of invalidated tokens for security purposes
 */
const BlacklistedTokenSchema = new Schema<IBlacklistedToken>({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true, // For fast token lookup
  },
  tokenType: {
    type: String,
    enum: ['access', 'refresh'],
    required: true,
  },
  userId: {
    type: String,
    required: true,
    index: true, // For user-specific blacklist queries
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'logout',
      'password_change',
      'account_suspension',
      'security_breach',
      'admin_revocation',
      'suspicious_activity',
      'expired_session',
    ],
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL index - auto-delete when token expires
  },
  blacklistedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
}, {
  timestamps: false, // We have custom timestamp fields
});

/**
 * Additional indexes for performance optimization
 */
BlacklistedTokenSchema.index({ userId: 1, tokenType: 1 });
BlacklistedTokenSchema.index({ blacklistedAt: 1 });

/**
 * Static methods for the BlacklistedToken model
 */
BlacklistedTokenSchema.statics.addToBlacklist = async function(
  token: string,
  tokenType: 'access' | 'refresh',
  userId: string,
  reason: string,
  expiresAt: Date
): Promise<IBlacklistedToken> {
  try {
    return await this.create({
      token,
      tokenType,
      userId,
      reason,
      expiresAt,
      blacklistedAt: new Date(),
    });
  } catch (error: any) {
    // Handle duplicate token errors gracefully
    if (error.code === 11000) {
      // Token already blacklisted, return existing record
      return await this.findOne({ token });
    }
    throw error;
  }
};

BlacklistedTokenSchema.statics.isBlacklisted = async function(token: string): Promise<boolean> {
  const blacklistedToken = await this.findOne({ token });
  return !!blacklistedToken;
};

BlacklistedTokenSchema.statics.blacklistUserTokens = async function(
  userId: string,
  tokenType?: 'access' | 'refresh',
  reason: string = 'user_action'
): Promise<number> {
  const filter: any = { userId };
  if (tokenType) {
    filter.tokenType = tokenType;
  }
  
  // Note: This method assumes you have a way to identify all tokens for a user
  // In practice, you might need to store active tokens or implement a different approach
  const result = await this.updateMany(
    filter,
    { 
      reason,
      blacklistedAt: new Date()
    }
  );
  
  return result.modifiedCount;
};

BlacklistedTokenSchema.statics.cleanupExpired = async function(): Promise<number> {
  // This is primarily for manual cleanup since TTL index handles most cases
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  return result.deletedCount;
};

/**
 * Instance methods
 */
BlacklistedTokenSchema.methods.isExpired = function(): boolean {
  return this.expiresAt < new Date();
};

/**
 * Pre-save middleware
 */
BlacklistedTokenSchema.pre<IBlacklistedToken>('save', function(next) {
  // Ensure blacklistedAt is set
  if (!this.blacklistedAt) {
    this.blacklistedAt = new Date();
  }
  
  // Validate that expiresAt is in the future
  if (this.expiresAt <= new Date()) {
    return next(new Error('Cannot blacklist an already expired token'));
  }
  
  next();
});

export const BlacklistedToken = mongoose.model<IBlacklistedToken, IBlacklistedTokenModel>('BlacklistedToken', BlacklistedTokenSchema);

/**
 * Token Management Service
 * Provides high-level methods for token blacklist management
 */
export class TokenBlacklistService {
  /**
   * Add a single token to the blacklist
   */
  static async blacklistToken(
    token: string,
    tokenType: 'access' | 'refresh',
    userId: string,
    reason: string,
    expiresAt: Date
  ): Promise<void> {
    await BlacklistedToken.addToBlacklist(token, tokenType, userId, reason, expiresAt);
  }

  /**
   * Check if a token is blacklisted
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    return await BlacklistedToken.isBlacklisted(token);
  }

  /**
   * Blacklist all tokens for a specific user
   */
  static async blacklistAllUserTokens(
    userId: string,
    reason: string = 'logout'
  ): Promise<number> {
    return await BlacklistedToken.blacklistUserTokens(userId, undefined, reason);
  }

  /**
   * Blacklist all refresh tokens for a user (e.g., on password change)
   */
  static async blacklistUserRefreshTokens(
    userId: string,
    reason: string = 'password_change'
  ): Promise<number> {
    return await BlacklistedToken.blacklistUserTokens(userId, 'refresh', reason);
  }

  /**
   * Get blacklisted tokens for a user (for debugging/monitoring)
   */
  static async getUserBlacklistedTokens(
    userId: string,
    limit: number = 50
  ): Promise<IBlacklistedToken[]> {
    const tokens = await BlacklistedToken.find({ userId })
      .sort({ blacklistedAt: -1 })
      .limit(limit)
      .lean()
    return tokens as unknown as IBlacklistedToken[]
  }

  /**
   * Clean up expired tokens manually (TTL index handles this automatically)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    return await BlacklistedToken.cleanupExpired();
  }

  /**
   * Get blacklist statistics
   */
  static async getBlacklistStats(): Promise<{
    totalBlacklisted: number;
    byType: { access: number; refresh: number };
    byReason: Record<string, number>;
  }> {
    const [totalCount, typeStats, reasonStats] = await Promise.all([
      BlacklistedToken.countDocuments(),
      BlacklistedToken.aggregate([
        {
          $group: {
            _id: '$tokenType',
            count: { $sum: 1 }
          }
        }
      ]),
      BlacklistedToken.aggregate([
        {
          $group: {
            _id: '$reason',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const byType = typeStats.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, { access: 0, refresh: 0 });

    const byReason = reasonStats.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      totalBlacklisted: totalCount,
      byType,
      byReason
    };
  }
}