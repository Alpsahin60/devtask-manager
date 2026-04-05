import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Enhanced Security Middleware
 * Provides comprehensive security headers, CSP, and additional protection layers.
 */

/**
 * Content Security Policy configuration
 * Restricts resource loading to prevent XSS and injection attacks
 */
const cspOptions = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
  },
};

/**
 * Enhanced helmet configuration with production-ready security headers
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? cspOptions : false,
  
  // X-DNS-Prefetch-Control: Controls DNS prefetching
  dnsPrefetchControl: { allow: false },
  
  // X-Frame-Options: Prevent clickjacking
  frameguard: { action: 'deny' },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // X-Download-Options: Prevent IE downloads in context
  ieNoOpen: true,
  
  // X-Content-Type-Options: Prevent MIME sniffing
  noSniff: true,
  
  // X-Permitted-Cross-Domain-Policies: Restrict Flash/PDF cross-domain
  permittedCrossDomainPolicies: false,
  
  // Referrer-Policy: Control referrer information
  referrerPolicy: { policy: ['no-referrer'] },
  
  // X-XSS-Protection: Enable XSS filtering (legacy)
  xssFilter: true,
  
  // Additional security headers
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
});

/**
 * HTTPS Enforcer Middleware
 * Redirects HTTP requests to HTTPS in production
 */
export const httpsEnforcer = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'production') {
    // Check if request is not secure
    if (!req.secure && req.get('X-Forwarded-Proto') !== 'https') {
      return res.redirect(301, `https://${req.get('Host')}${req.url}`);
    }
  }
  next();
};

/**
 * No Cache Middleware for Sensitive Routes
 * Prevents caching of authentication and user data endpoints
 */
export const noCache = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
};

/**
 * API Security Headers Middleware
 * Additional API-specific security headers
 */
export const apiSecurity = (_req: Request, res: Response, next: NextFunction): void => {
  // Prevent caching of API responses
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  // API version header
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
  
  // Rate limit information headers (to be used with rate limiting middleware)
  res.setHeader('X-RateLimit-Limit', process.env.RATE_LIMIT_MAX || '100');
  
  // Security policy headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  next();
};

/**
 * Request Size Limiter Middleware
 * Prevents large payload attacks
 */
export const requestSizeLimiter = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const limitInBytes = parseSize(limit);
      
      if (sizeInBytes > limitInBytes) {
        res.status(413).json({
          success: false,
          error: 'Request payload too large',
          maxSize: limit,
        });
        return;
      }
    }
    
    next();
  };
};

/**
 * Helper function to parse size strings (e.g., "10mb", "1gb")
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  return value * units[unit];
}

/**
 * IP Whitelist Middleware
 * Restricts access based on IP addresses (for admin endpoints)
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (process.env.NODE_ENV === 'development') {
      // Allow all IPs in development
      return next();
    }
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this resource',
      });
      return;
    }
    
    next();
  };
};