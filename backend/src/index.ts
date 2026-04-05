import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Global type for mock database flag
declare global {
  var useMockDatabase: boolean;
}

import { connectDatabase } from './config/database';
import { connectMockDatabase } from './config/mockDatabase';
import { errorHandler } from './middleware/errorMiddleware';
import { 
  securityHeaders, 
  httpsEnforcer, 
  noCache, 
  apiSecurity, 
  requestSizeLimiter 
} from './middleware/securityMiddleware';
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();
const PORT = process.env.PORT ?? 5000;

// ─── Security Middleware ──────────────────────────────────────────────────────

// HTTPS redirection in production
app.use(httpsEnforcer);

// Enhanced security headers with CSP, HSTS, etc.
app.use(securityHeaders);

// Request size limiting to prevent large payload attacks
app.use(requestSizeLimiter('10mb'));

// CORS: allow requests from configured frontend origins
const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true, // required for cookies to be sent cross-origin
  })
);

// Rate limiting is only applied in production — no interference during development
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later' },
  });
  app.use('/api', limiter);

  // Stricter limit on login/register to prevent brute-force attacks
  const authLimiter = rateLimit({
    windowMs: 8 * 60 * 1000, // 8 minutes
    max: 8, // limit each IP to 8 auth attempts per windowMs
    message: { success: false, message: 'Too many auth attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  
  // Even stricter limit for password reset to prevent abuse
  const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 password reset attempts per hour
    message: { success: false, message: 'Too many password reset attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth/forgot-password', passwordResetLimiter);
  app.use('/api/auth/reset-password', passwordResetLimiter);
}

// ─── Body Parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10kb' })); // prevent large payload attacks
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// Apply API security headers to all API routes
app.use('/api', apiSecurity);

// Apply no-cache headers to authentication routes
app.use('/api/auth', noCache);

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

// Must be registered AFTER all routes
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

const start = async (): Promise<void> => {
  try {
    // Try to connect to MongoDB first
    await connectDatabase();
    global.useMockDatabase = false;
  } catch (error) {
    console.warn('⚠️  MongoDB not available, switching to Mock Database');
    console.warn('📖 For MongoDB setup instructions, see MONGODB_SETUP.md');
    await connectMockDatabase();
    global.useMockDatabase = true;
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
    console.log(`📊 Database: ${global.useMockDatabase ? 'Mock (In-Memory)' : 'MongoDB'}`);
  });
};

start();

export default app;
