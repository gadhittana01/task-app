import { Request } from 'express';
import { TaskComment } from '../models/TaskComment';
import { Task } from '../models/Task';
import { z } from 'zod';
import mongoose from 'mongoose';
import { RequestContext } from '../middleware/context';
import { QueueServiceError } from '../services/queueService';
import { notificationService } from '../services/notificationService';

const createCommentSchema = z.object({
  content: z.string().min(1),
  parentComment: z.string().optional(),
  mentions: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
});

const toCommentResponse = (comment: any): any => ({
  id: comment._id.toString(),
  taskId: comment.taskId.toString(),
  userId: comment.userId.toString(),
  content: comment.content,
  parentComment: comment.parentComment?.toString(),
  attachments: comment.attachments,
  mentions: comment.mentions.map((id: any) => id.toString()),
  isEdited: comment.isEdited,
  createdAt: comment.createdAt.toISOString(),
  updatedAt: comment.updatedAt.toISOString(),
});

interface AuthenticatedRequest extends Request {
  body: any;
  context: RequestContext;
}

export const createComment = async (
  req: AuthenticatedRequest,
  res: { status: (code: number) => { json: (data: any) => void } }
) => {
  try {
    const taskId = req.params.taskId;
    const validatedData = createCommentSchema.parse(req.body);

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const mentions = validatedData.mentions?.map(id => new mongoose.Types.ObjectId(id)) || [];

    const comment = new TaskComment({
      taskId,
      userId: req.context.userId,
      content: validatedData.content,
      parentComment: validatedData.parentComment ? new mongoose.Types.ObjectId(validatedData.parentComment) : undefined,
      mentions,
      attachments: validatedData.attachments || [],
    });

    await comment.save();

    if (mentions.length > 0) {
      try {
        await Promise.all(
          mentions.map(userId => 
            notificationService.sendTaskCommentNotification(
              userId.toString(),
              `${req.context.email} mentioned you in a comment on task "${task.title}"`,
              task._id.toString(),
              task.title,
              comment._id.toString(),
              req.context.email,
              validatedData.content
            )
          )
        );
      } catch (error) {
        console.error('Failed to send mention notifications:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    const notifyUsers = [task.createdBy, ...task.assignedTo]
      .filter(userId => userId.toString() !== req.context.userId)
      .map(userId => userId.toString());
      
    if (notifyUsers.length > 0) {
      try {
        await Promise.all(
          notifyUsers.map(userId => 
            notificationService.sendTaskCommentNotification(
              userId,
              `${req.context.email} commented on task "${task.title}"`,
              task._id.toString(),
              task.title,
              comment._id.toString(),
              req.context.email,
              validatedData.content
            )
          )
        );
      } catch (error) {
        console.error('Failed to send task comment notifications:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    res.status(201).json(toCommentResponse(comment));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }
    if (error instanceof QueueServiceError) {
      console.error('Queue service error:', error.message, error.cause);
    }
    console.error('Error creating comment:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Error creating comment' });
  }
};

export const getTaskComments = async (
  req: AuthenticatedRequest,
  res: { status: (code: number) => { json: (data: any) => void } }
) => {
  try {
    const taskId = req.params.taskId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const comments = await TaskComment.find({ taskId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await TaskComment.countDocuments({ taskId });

    res.status(200).json({
      comments: comments.map(toCommentResponse),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching comments:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Error fetching comments' });
  }
};

export const updateComment = async (
  req: AuthenticatedRequest,
  res: { status: (code: number) => { json: (data: any) => void } }
) => {
  try {
    const commentId = req.params.commentId;
    const validatedData = createCommentSchema.parse(req.body);

    const comment = await TaskComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId.toString() !== req.context.userId) {
      return res.status(403).json({ error: 'Not authorized to update this comment' });
    }

    const mentions = validatedData.mentions?.map(id => new mongoose.Types.ObjectId(id)) || [];
    const attachments = validatedData.attachments || [];

    comment.content = validatedData.content;
    comment.mentions = mentions;
    comment.attachments = attachments;
    comment.isEdited = true;
    comment.editHistory.push({
      content: validatedData.content,
      editedAt: new Date(),
      editedBy: new mongoose.Types.ObjectId(req.context.userId),
    });

    await comment.save();

    res.status(200).json(toCommentResponse(comment));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }
    console.error('Error updating comment:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Error updating comment' });
  }
};

export const deleteComment = async (
  req: AuthenticatedRequest,
  res: { status: (code: number) => { json: (data: any) => void } }
) => {
  try {
    const commentId = req.params.commentId;

    const comment = await TaskComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId.toString() !== req.context.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await comment.deleteOne();

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Error deleting comment' });
  }
}; 