import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import {
  getSprints,
  getActiveSprint,
  getSprintById,
  createSprint,
  updateSprint,
  deleteSprint,
} from '../controllers/sprintController';
import {
  createSprintSchema,
  updateSprintSchema,
  sprintListQuerySchema,
} from '../schemas/sprintSchemas';
import standupRoutes from './standupRoutes';
import retroRoutes from './retroRoutes';

const router = Router();

// All sprint routes require authentication.
router.use(protect);

router
  .route('/')
  .get(validate(sprintListQuerySchema, 'query'), getSprints)
  .post(validate(createSprintSchema), createSprint);

// Listed before /:id so Express does not interpret "active" as an id.
router.get('/active', getActiveSprint);

router
  .route('/:id')
  .get(getSprintById)
  .patch(validate(updateSprintSchema), updateSprint)
  .delete(deleteSprint);

// Nested resources — standups and retros are scoped to a single sprint.
router.use('/:id/standups', standupRoutes);
router.use('/:id/retro', retroRoutes);

export default router;
