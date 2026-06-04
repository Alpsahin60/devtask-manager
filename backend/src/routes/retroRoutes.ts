import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { requireNotDemo } from '../middleware/demoMiddleware';
import { validate } from '../middleware/validationMiddleware';
import {
  getRetroItems,
  createRetroItem,
  updateRetroItem,
  deleteRetroItem,
} from '../controllers/retroController';
import {
  createRetroItemSchema,
  updateRetroItemSchema,
} from '../schemas/retroSchemas';

// Mounted under /api/sprints/:id/retro — mergeParams so the controller
// can read req.params.id (the sprint id) and req.params.itemId.
const router = Router({ mergeParams: true });

router.use(protect);

router
  .route('/')
  .get(getRetroItems)
  .post(requireNotDemo, validate(createRetroItemSchema), createRetroItem);

router
  .route('/:itemId')
  .patch(requireNotDemo, validate(updateRetroItemSchema), updateRetroItem)
  .delete(requireNotDemo, deleteRetroItem);

export default router;
