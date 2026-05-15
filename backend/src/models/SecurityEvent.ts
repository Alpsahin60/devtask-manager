import mongoose, { Schema, Document } from 'mongoose';

// Plain-shape interface — usable for lean queries and POJO operations
export interface ISecurityEvent {
  userId?: mongoose.Types.ObjectId;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  eventType: 'login_success' | 'login_failure' | 'account_locked' | 'password_reset' | 'suspicious_activity' |
            'registration_success' | 'registration_failed' | 'registration_blocked' |
            'token_refresh_success' | 'token_refresh_failed' | 'token_refresh_blocked' |
            'logout_success' | 'admin_action';
  details?: Record<string, unknown> | string;
  timestamp: Date;
}

export interface ISecurityEventDocument extends ISecurityEvent, Document {}

const securityEventSchema = new Schema<ISecurityEventDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    email: {
      type: String,
      required: false,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: false,
    },
    eventType: {
      type: String,
      enum: [
        'login_success', 
        'login_failure', 
        'account_locked', 
        'password_reset', 
        'suspicious_activity',
        'registration_success',
        'registration_failed',
        'registration_blocked',
        'token_refresh_success',
        'token_refresh_failed',
        'token_refresh_blocked',
        'logout_success',
        'admin_action'
      ],
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      required: false,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // using custom timestamp field
  }
);

// Index for efficient queries
securityEventSchema.index({ email: 1, eventType: 1, timestamp: -1 });
securityEventSchema.index({ userId: 1, timestamp: -1 });
securityEventSchema.index({ ipAddress: 1, timestamp: -1 });

export const SecurityEvent = mongoose.model<ISecurityEventDocument>('SecurityEvent', securityEventSchema);