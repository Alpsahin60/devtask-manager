import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import { TokenBlacklistService } from '../models/BlacklistedToken';

/**
 * Generates a short-lived access token (default: 15 minutes).
 * Used in Authorization header or httpOnly cookie.
 */
export const generateAccessToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';

  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

/**
 * Generates a long-lived refresh token (default: 7 days).
 * Used only to issue new access tokens — stored in httpOnly cookie.
 */
export const generateRefreshToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

/**
 * Verifies an access token and returns the decoded payload.
 * Throws if the token is invalid, expired, or blacklisted.
 */
export const verifyAccessToken = async (token: string): Promise<JwtPayload> => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');

  // Check if token is blacklisted before verifying
  const isBlacklisted = await TokenBlacklistService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    throw new Error('Token has been revoked');
  }

  return jwt.verify(token, secret) as JwtPayload;
};

/**
 * Verifies a refresh token and returns the decoded payload.
 * Throws if the token is invalid, expired, or blacklisted.
 */
export const verifyRefreshToken = async (token: string): Promise<JwtPayload> => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');

  // Check if token is blacklisted before verifying
  const isBlacklisted = await TokenBlacklistService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    throw new Error('Token has been revoked');
  }

  return jwt.verify(token, secret) as JwtPayload;
};

/**
 * Synchronous version of access token verification (for compatibility)
 * Note: This does not check the blacklist - use verifyAccessToken for security
 */
export const verifyAccessTokenSync = (token: string): JwtPayload => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');

  return jwt.verify(token, secret) as JwtPayload;
};

/**
 * Synchronous version of refresh token verification (for compatibility)
 * Note: This does not check the blacklist - use verifyRefreshToken for security
 */
export const verifyRefreshTokenSync = (token: string): JwtPayload => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');

  return jwt.verify(token, secret) as JwtPayload;
};

/**
 * Extracts the expiration date from a JWT token
 */
export const getTokenExpiration = (token: string): Date => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      throw new Error('Invalid token or missing expiration');
    }
    return new Date(decoded.exp * 1000); // Convert from seconds to milliseconds
  } catch (error) {
    throw new Error('Failed to extract token expiration');
  }
};

/**
 * Decodes a JWT token without verification (for extracting payload info)
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};

/**
 * Checks if a JWT token is expired (without verification)
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return true; // Treat invalid tokens as expired
    }
    return decoded.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true; // Treat decode errors as expired
  }
};

/**
 * Enhanced token generation with blacklist support
 */
export const generateTokenPair = (payload: JwtPayload): {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: Date;
  refreshTokenExpires: Date;
} => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Calculate expiration dates
  const accessTokenExpires = getTokenExpiration(accessToken);
  const refreshTokenExpires = getTokenExpiration(refreshToken);

  return {
    accessToken,
    refreshToken,
    accessTokenExpires,
    refreshTokenExpires,
  };
};
