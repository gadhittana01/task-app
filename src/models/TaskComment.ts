import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskComment extends Document {
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  parentComment?: mongoose.Types.ObjectId;
  attachments: string[];
  mentions: mongoose.Types.ObjectId[];
  isEdited: boolean;
  editHistory: {
    content: string;
    editedAt: Date;
    editedBy: mongoose.Types.ObjectId;
  }[];
}

const taskCommentSchema = new Schema<ITaskComment>(
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
    content: {
      type: String,
      required: true,
      trim: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'TaskComment',
    },
    attachments: [{
      type: String,
    }],
    mentions: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [{
      content: {
        type: String,
        required: true,
      },
      editedAt: {
        type: Date,
        required: true,
      },
      editedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
taskCommentSchema.index({ taskId: 1, createdAt: -1 });
taskCommentSchema.index({ userId: 1, createdAt: -1 });
taskCommentSchema.index({ parentComment: 1 });

export const TaskComment = mongoose.model<ITaskComment>('TaskComment', taskCommentSchema); 