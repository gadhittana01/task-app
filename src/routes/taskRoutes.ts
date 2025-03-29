import express from 'express';
import {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getTasks,
} from '../controllers/taskController';
import { authenticateToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

router.use(limiter);

router.use(authenticateToken);

router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;