import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { requireNotDemo } from '../middleware/demoMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { getStandups, upsertStandup } from '../controllers/standupController';
import { upsertStandupSchema } from '../schemas/standupSchemas';

// Mounted under /api/sprints/:id/standups — mergeParams so the controller
// can read req.params.id (the sprint id).
const router = Router({ mergeParams: true });

router.use(protect);

router
  .route('/')
  .get(getStandups)
  .put(requireNotDemo, validate(upsertStandupSchema), upsertStandup);

export default router;
