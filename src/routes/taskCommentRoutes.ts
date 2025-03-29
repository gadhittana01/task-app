import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment
} from '../controllers/taskCommentController';

const router = express.Router();

// Apply authentication middleware to all comment routes
router.use(authenticateToken);

// Comment routes
router.post('/:taskId', createComment);
router.get('/:taskId', getTaskComments);
router.put('/:commentId', updateComment);
router.delete('/:commentId', deleteComment);

export default router; 