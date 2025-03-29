import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { configManager } from '../config/config';
import { z } from 'zod';

const snsClient = new SNSClient({
  region: configManager.getConfig().aws.region
});

export enum QueueEventType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  TASK_COMMENT_ADDED = 'TASK_COMMENT_ADDED',
  TASK_COMMENT_UPDATED = 'TASK_COMMENT_UPDATED',
  TASK_COMMENT_DELETED = 'TASK_COMMENT_DELETED',
  USER_NOTIFICATION = 'USER_NOTIFICATION'
}

export enum TopicType {
  TASK_LOGGING = 'TASK_LOGGING',
  USER_NOTIFICATIONS = 'USER_NOTIFICATIONS'
}

const QueueMessageSchema = z.object({
  eventType: z.nativeEnum(QueueEventType),
  taskId: z.string().min(1),
  userId: z.string().min(1),
  changes: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
  topic: z.nativeEnum(TopicType)
});

export type QueueMessage = z.infer<typeof QueueMessageSchema>;

export class QueueServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'QueueServiceError';
  }
}

export const publishToQueue = async (message: QueueMessage): Promise<void> => {
  try {
    const validatedMessage = QueueMessageSchema.parse(message);
    const config = configManager.getConfig();

    let topicArn = config.aws.snsTaskLoggingTopic;
    
    if (validatedMessage.topic === TopicType.USER_NOTIFICATIONS) {
      topicArn = config.aws.snsUserNotificationsTopic;
    }
    
    const command = new PublishCommand({
      Message: JSON.stringify(validatedMessage),
      TopicArn: topicArn,
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: validatedMessage.eventType
        },
        topic: {
          DataType: 'String',
          StringValue: validatedMessage.topic
        }
      }
    });
    
    await snsClient.send(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new QueueServiceError('Invalid message format', error);
    }
    if (error instanceof Error) {
      throw new QueueServiceError('Failed to publish message to SNS', error);
    }
    throw new QueueServiceError('An unknown error occurred while publishing message');
  }
};