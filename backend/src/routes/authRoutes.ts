import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import {
  register,
  login,
  logout,
  refresh,
  getMe,
} from '../controllers/authController';
import { registerSchema, loginSchema } from '../schemas/authSchemas';

const router = Router();

// Public routes — no authentication required
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.post('/refresh', refresh);

// Protected route — requires valid access token
router.get('/me', protect, getMe);

export default router;
