import mongoose, { Document, Schema } from 'mongoose';
import { TaskStatus } from './Task';

export interface ITaskHistory extends Document {
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  oldStatus?: TaskStatus;
  newStatus?: TaskStatus;
  changes: Record<string, any>;
  comment?: string;
  metadata: Record<string, any>;
}

const taskHistorySchema = new Schema<ITaskHistory>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'delete', 'status_change', 'assign', 'comment'],
    },
    oldStatus: {
      type: String,
      enum: Object.values(TaskStatus),
    },
    newStatus: {
      type: String,
      enum: Object.values(TaskStatus),
    },
    changes: {
      type: Schema.Types.Mixed,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
taskHistorySchema.index({ taskId: 1, createdAt: -1 });
taskHistorySchema.index({ userId: 1, createdAt: -1 });
taskHistorySchema.index({ action: 1, createdAt: -1 });

export const TaskHistory = mongoose.model<ITaskHistory>('TaskHistory', taskHistorySchema); 