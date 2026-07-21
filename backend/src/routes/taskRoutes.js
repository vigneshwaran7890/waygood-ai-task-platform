import express from 'express';
import { createTask, listTasks, getTask } from '../controllers/taskController.js';
import { validateCreateTask } from '../validators/taskValidator.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', validateCreateTask, createTask);
router.get('/', listTasks);
router.get('/:id', getTask);

export default router;
