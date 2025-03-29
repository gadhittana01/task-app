import { NotificationType } from '../models/Notification';
import { Task } from '../models/Task';
import { publishToQueue, QueueEventType, TopicType, QueueServiceError } from './queueService';

class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async sendTaskAssignmentNotification(userId: string, message: string, taskId: string, taskTitle: string, assignedBy?: string): Promise<void> {
    try {
      await publishToQueue({
        eventType: QueueEventType.USER_NOTIFICATION,
        taskId,
        userId,
        topic: TopicType.USER_NOTIFICATIONS,
        changes: {
          notificationType: NotificationType.TASK_ASSIGNED,
          message,
          taskTitle,
          assignedBy
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send task assignment notification:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof QueueServiceError) {
        console.error('Queue service error details:', error.cause);
      }
      throw error;
    }
  }

  public async sendTaskUpdateNotification(userId: string, message: string, taskId: string, taskTitle: string, updatedBy?: string): Promise<void> {
    try {
      await publishToQueue({
        eventType: QueueEventType.USER_NOTIFICATION,
        taskId,
        userId,
        topic: TopicType.USER_NOTIFICATIONS,
        changes: {
          notificationType: NotificationType.TASK_UPDATED,
          message,
          taskTitle,
          updatedBy
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send task update notification:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof QueueServiceError) {
        console.error('Queue service error details:', error.cause);
      }
      throw error;
    }
  }

  public async sendTaskCommentNotification(userId: string, message: string, taskId: string, taskTitle: string, commentId: string, commentedBy?: string, commentContent?: string): Promise<void> {
    try {
      await publishToQueue({
        eventType: QueueEventType.USER_NOTIFICATION,
        taskId,
        userId,
        topic: TopicType.USER_NOTIFICATIONS,
        changes: {
          notificationType: NotificationType.TASK_COMMENT,
          message,
          taskTitle,
          commentId,
          commentedBy,
          commentContent
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send task comment notification:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof QueueServiceError) {
        console.error('Queue service error details:', error.cause);
      }
      throw error;
    }
  }

  public async sendTaskUpdate(userId: string, message: string, taskId: string, updatedBy?: string): Promise<void> {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        console.error(`Task not found with ID: ${taskId}`);
        return;
      }

      await this.sendTaskUpdateNotification(userId, message, taskId, task.title, updatedBy);
    } catch (error) {
      console.error('Failed to send task update:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof QueueServiceError) {
        console.error('Queue service error details:', error.cause);
      }
      throw error;
    }
  }

  public async sendTaskAssignment(userId: string, message: string, taskId: string, assignedBy?: string): Promise<void> {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        console.error(`Task not found with ID: ${taskId}`);
        return;
      }

      await this.sendTaskAssignmentNotification(userId, message, taskId, task.title, assignedBy);
    } catch (error) {
      console.error('Failed to send task assignment:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof QueueServiceError) {
        console.error('Queue service error details:', error.cause);
      }
      throw error;
    }
  }

  public async sendTaskComment(userId: string, message: string, taskId: string, commentId: string, commentedBy?: string, commentContent?: string): Promise<void> {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        console.error(`Task not found with ID: ${taskId}`);
        return;
      }

      await this.sendTaskCommentNotification(userId, message, taskId, task.title, commentId, commentedBy, commentContent);
    } catch (error) {
      console.error('Failed to send task comment:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof QueueServiceError) {
        console.error('Queue service error details:', error.cause);
      }
      throw error;
    }
  }
}

export const notificationService = NotificationService.getInstance(); 