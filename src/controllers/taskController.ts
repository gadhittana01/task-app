import { Request, Response } from 'express';
import { Task } from '../models/Task';
import { z } from 'zod';
import { RequestContext } from '../middleware/context';
import { publishToQueue, QueueEventType, TopicType } from '../services/queueService';
import { User } from '../models/User';
import { notificationService } from '../services/notificationService';

interface AuthenticatedRequest extends Request {
  body: any;
  context: RequestContext;
}

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const validatedData = z.object({
      title: z.string().min(1).max(100),
      description: z.string().min(1),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      dueDate: z.string().datetime(),
      assignedTo: z.array(z.string()),
      tags: z.array(z.string()).optional(),
      attachments: z.array(z.string()).optional(),
      estimatedHours: z.number().min(0),
    }).parse(req.body);

    const task = new Task({
      ...validatedData,
      createdBy: req.context.userId
    });
    await task.save();

    await publishToQueue({
      eventType: QueueEventType.TASK_CREATED,
      taskId: task._id.toString(),
      userId: req.context.userId,
      topic: TopicType.TASK_LOGGING,
      timestamp: new Date().toISOString()
    }).catch(() => {
    });

    const user = await User.findById(req.context.userId);
    const creatorName = user ? `${user.firstName} ${user.lastName}` : req.context.email;

    if (validatedData.assignedTo && validatedData.assignedTo.length > 0) {
      Promise.all(validatedData.assignedTo.map(assigneeId => 
        notificationService.sendTaskAssignmentNotification(
          assigneeId,
          `You have been assigned to task "${validatedData.title}"`,
          task._id.toString(),
          task.title,
          creatorName
        )
      )).catch(() => {
      });
    }

    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Error creating task' });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const taskId = req.params.id;
    const validatedData = z.object({
      title: z.string().min(1).max(100).optional(),
      description: z.string().min(1).optional(),
      status: z.enum(['todo', 'in_progress', 'review', 'completed']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      dueDate: z.string().datetime().optional(),
      assignedTo: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      attachments: z.array(z.string()).optional(),
      estimatedHours: z.number().min(0).optional(),
      actualHours: z.number().min(0).optional(),
    }).parse(req.body);
    
    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const isCreator = task.createdBy.toString() === req.context.userId;
    const isAssignee = task.assignedTo.some(id => id.toString() === req.context.userId);

    if (!isCreator && !isAssignee) {
      res.status(403).json({ error: 'Not authorized to update this task' });
      return;
    }

    const originalTask = { ...task.toObject() };

    Object.assign(task, validatedData);
    await task.save();

    const user = await User.findById(req.context.userId);
    const updaterName = user ? `${user.firstName} ${user.lastName}` : req.context.email;

    const changes: Record<string, { old: any; new: any }> = {};
    for (const [key, value] of Object.entries(validatedData)) {
      if (key in originalTask && JSON.stringify((originalTask as any)[key]) !== JSON.stringify(value)) {
        changes[key] = {
          old: (originalTask as any)[key],
          new: value
        };
      }
    }

    await publishToQueue({
      eventType: QueueEventType.TASK_UPDATED,
      taskId: task._id.toString(),
      userId: req.context.userId,
      changes,
      topic: TopicType.TASK_LOGGING,
      timestamp: new Date().toISOString()
    }).catch(() => {
    });

    if (validatedData.assignedTo && !arraysEqual(originalTask.assignedTo.map(id => id.toString()), validatedData.assignedTo)) {
      const newAssignees = validatedData.assignedTo.filter(
        id => !originalTask.assignedTo.some(originalId => originalId.toString() === id)
      );

      if (newAssignees.length > 0) {
        Promise.all(newAssignees.map(assigneeId => 
          notificationService.sendTaskAssignmentNotification(
            assigneeId,
            `You have been assigned to task "${task.title}"`,
            task._id.toString(),
            task.title,
            updaterName
          )
        )).catch(() => {
        });
      }
    }

    const assigneesToNotify = task.assignedTo
      .filter(assigneeId => assigneeId.toString() !== req.context.userId)
      .map(assigneeId => assigneeId.toString());

    if (assigneesToNotify.length > 0) {
      console.log("assigneesToNotify: ",assigneesToNotify);
      Promise.all(assigneesToNotify.map(assigneeId =>
        notificationService.sendTaskUpdateNotification(
          assigneeId,
          `Task "${task.title}" has been updated`,
          task._id.toString(),
          task.title,
          updaterName
        )
      )).catch(() => {
      });
    }

    res.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Error updating task' });
  }
};

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.context.userId
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await publishToQueue({
      eventType: QueueEventType.TASK_DELETED,
      taskId: req.params.id,
      userId: req.context.userId,
      topic: TopicType.TASK_LOGGING,
      timestamp: new Date().toISOString()
    }).catch(() => {
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error deleting task' });
  }
};

export const getTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.context.userId },
        { assignedTo: req.context.userId }
      ]
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching task' });
  }
};

export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    
    const query: any = {
      $or: [
        { createdBy: req.context.userId },
        { assignedTo: req.context.userId }
      ]
    };
    
    if (status) {
      query.status = status;
    }
    
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Task.countDocuments(query);
    
    res.json({
      tasks,
      total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
}; 