import express from 'express';
import {
  getSecurityDashboard,
  getSecurityEvents,
  getBlacklistedTokens,
  performUserAction,
  getSecurityAnalytics,
  requireAdmin
} from '../controllers/adminSecurityController';
import { protect } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { z } from 'zod';

const router = express.Router();

// Apply authentication and admin check to all routes
router.use(protect);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/security/dashboard
 * @desc    Get security dashboard overview
 * @access  Admin only
 */
router.get('/dashboard', getSecurityDashboard);

/**
 * @route   GET /api/admin/security/events
 * @desc    Get paginated security events with filtering
 * @access  Admin only
 * @query   userId, eventType, startDate, endDate, page, limit, ipAddress
 */
router.get('/events', getSecurityEvents);

/**
 * @route   GET /api/admin/security/blacklist
 * @desc    Get paginated blacklisted tokens
 * @access  Admin only
 * @query   userId, tokenType, reason, page, limit
 */
router.get('/blacklist', getBlacklistedTokens);

/**
 * @route   POST /api/admin/security/user-action
 * @desc    Perform security actions on user accounts
 * @access  Admin only
 * @body    { userId, action, reason }
 */
const userActionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  action: z.enum(['unlock', 'lock', 'reset-attempts', 'force-logout']),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

router.post('/user-action', validate(userActionSchema), performUserAction);

/**
 * @route   GET /api/admin/security/analytics
 * @desc    Get security analytics and trends
 * @access  Admin only
 * @query   days (default: 7)
 */
router.get('/analytics', getSecurityAnalytics);

export default router;