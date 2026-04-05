import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password: string;
  // Account security fields
  isLocked: boolean;
  lockedUntil?: Date;
  loginAttempts: number;
  lastFailedLogin?: Date;
  passwordChangedAt: Date;
  // 2FA fields (future enhancement)
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  backupCodes?: string[];
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  incLoginAttempts(): Promise<void>;
  isAccountLocked(): boolean;
  resetLoginAttempts(): Promise<void>;
  unlockAccount(): Promise<void>;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      // Never send password in API responses
      select: false,
    },
    // Account Security Fields
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedUntil: {
      type: Date,
      required: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lastFailedLogin: {
      type: Date,
      required: false,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
    // 2FA fields (for future enhancement)
    twoFactorSecret: {
      type: String,
      required: false,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    backupCodes: {
      type: [String],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true, // auto-manages createdAt & updatedAt
  }
);

// Hash password before saving — only when it has been modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to verify password during login
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Account lockout constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

// Virtual property to check if account is currently locked
userSchema.methods.isAccountLocked = function(): boolean {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

// Increment login attempts and lock account if max attempts exceeded
userSchema.methods.incLoginAttempts = async function(): Promise<void> {
  // Check if account was previously locked and lock time has expired
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockedUntil: 1 },
      $set: { loginAttempts: 1, lastFailedLogin: Date.now() }
    });
  }

  const updates: any = {
    $inc: { loginAttempts: 1 },
    $set: { lastFailedLogin: Date.now() }
  };

  // Lock account after max attempts
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isAccountLocked()) {
    updates.$set.lockedUntil = Date.now() + LOCK_TIME;
    updates.$set.isLocked = true;
  }

  return this.updateOne(updates);
};

// Reset login attempts after successful login
userSchema.methods.resetLoginAttempts = async function(): Promise<void> {
  return this.updateOne({
    $unset: { loginAttempts: 1, lastFailedLogin: 1, lockedUntil: 1 },
    $set: { isLocked: false }
  });
};

// Unlock account manually (admin action)
userSchema.methods.unlockAccount = async function(): Promise<void> {
  return this.updateOne({
    $unset: { loginAttempts: 1, lastFailedLogin: 1, lockedUntil: 1 },
    $set: { isLocked: false }
  });
};

export const User = mongoose.model<IUserDocument>('User', userSchema);
