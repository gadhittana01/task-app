import mongoose, { Document, Schema } from 'mongoose';

export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_COMMENT = 'TASK_COMMENT',
  TASK_DELETED = 'TASK_DELETED',
  TASK_COMPLETED = 'task_completed',
  COMMENT_ADDED = 'comment_added',
  MENTIONED = 'mentioned',
  DUE_DATE_APPROACHING = 'due_date_approaching',
  TASK_OVERDUE = 'task_overdue',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  taskId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  metadata: Record<string, any>;
  readAt?: Date;
  archivedAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.UNREAD,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'TaskComment',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    readAt: {
      type: Date,
    },
    archivedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ taskId: 1, createdAt: -1 });
notificationSchema.index({ commentId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema); 