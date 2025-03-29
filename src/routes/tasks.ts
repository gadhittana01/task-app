import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getTasks
} from '../controllers/taskController';

const router = express.Router();

// Apply authentication middleware to all task routes
router.use(authenticateToken);

// Task routes
router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router; 