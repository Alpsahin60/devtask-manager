import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
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
  .post(validate(createRetroItemSchema), createRetroItem);

router
  .route('/:itemId')
  .patch(validate(updateRetroItemSchema), updateRetroItem)
  .delete(deleteRetroItem);

export default router;
