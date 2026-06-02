import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController';
import { createTaskSchema, updateTaskSchema } from '../schemas/taskSchemas';

const router = Router();

// All task routes require authentication
router.use(protect);

router.route('/').get(getTasks).post(validate(createTaskSchema), createTask);

router
  .route('/:id')
  .get(getTaskById)
  .patch(validate(updateTaskSchema), updateTask)
  .delete(deleteTask);

export default router;
