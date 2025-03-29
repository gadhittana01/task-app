import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { configManager } from '../config/config';
import { TaskHistory } from '../models/TaskHistory';
import { QueueEventType, QueueMessage, TopicType } from './queueService';
import { z } from 'zod';
import mongoose from 'mongoose';
import { NotificationType } from '../models/Notification';
import { User } from '../models/User';
import { emailService } from './emailService';

const sqsClient = new SQSClient({
  region: configManager.getConfig().aws.region
});

const QueueMessageSchema = z.object({
  eventType: z.nativeEnum(QueueEventType),
  taskId: z.string().min(1),
  userId: z.string().min(1),
  changes: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
  topic: z.nativeEnum(TopicType)
});

const taskHistoryHandlers = {
  [QueueEventType.TASK_CREATED]: async (message: QueueMessage) => {
    await TaskHistory.create({
      taskId: new mongoose.Types.ObjectId(message.taskId),
      userId: new mongoose.Types.ObjectId(message.userId),
      action: 'create',
      changes: message.changes || {},
      timestamp: new Date(message.timestamp)
    });
  },
  [QueueEventType.TASK_UPDATED]: async (message: QueueMessage) => {
    await TaskHistory.create({
      taskId: new mongoose.Types.ObjectId(message.taskId),
      userId: new mongoose.Types.ObjectId(message.userId),
      action: 'update',
      changes: message.changes || {},
      timestamp: new Date(message.timestamp)
    });
  },
  [QueueEventType.TASK_DELETED]: async (message: QueueMessage) => {
    await TaskHistory.create({
      taskId: new mongoose.Types.ObjectId(message.taskId),
      userId: new mongoose.Types.ObjectId(message.userId),
      action: 'delete',
      changes: message.changes || {},
      timestamp: new Date(message.timestamp)
    });
  },
  [QueueEventType.TASK_COMMENT_ADDED]: async (message: QueueMessage) => {
    await TaskHistory.create({
      taskId: new mongoose.Types.ObjectId(message.taskId),
      userId: new mongoose.Types.ObjectId(message.userId),
      action: 'comment_added',
      changes: message.changes || {},
      timestamp: new Date(message.timestamp)
    });
  },
  [QueueEventType.TASK_COMMENT_UPDATED]: async (message: QueueMessage) => {
    await TaskHistory.create({
      taskId: new mongoose.Types.ObjectId(message.taskId),
      userId: new mongoose.Types.ObjectId(message.userId),
      action: 'comment_updated',
      changes: message.changes || {},
      timestamp: new Date(message.timestamp)
    });
  },
  [QueueEventType.TASK_COMMENT_DELETED]: async (message: QueueMessage) => {
    await TaskHistory.create({
      taskId: new mongoose.Types.ObjectId(message.taskId),
      userId: new mongoose.Types.ObjectId(message.userId),
      action: 'comment_deleted',
      changes: message.changes || {},
      timestamp: new Date(message.timestamp)
    });
  }
};

const userNotificationHandlers = {
  [QueueEventType.USER_NOTIFICATION]: async (message: QueueMessage) => {
    if (!message.changes || !message.changes.notificationType) {
      console.error('USER_NOTIFICATION without notificationType in changes');
      return;
    }

    const { notificationType, taskTitle, updatedBy, assignedBy, commentedBy, commentContent } = message.changes;
    
    const user = await User.findById(message.userId);
    if (!user || !user.email) {
      console.log(`SQS CONSUMER: User ${message.userId} not found or has no email, skipping email notification`);
      return;
    }
    
    switch (notificationType) {
      case NotificationType.TASK_UPDATED:
        await emailService.sendTaskUpdateEmail(
          user.email,
          taskTitle,
          message.taskId,
          updatedBy || 'Someone'
        );
        break;
        
      case NotificationType.TASK_ASSIGNED:
        await emailService.sendTaskAssignmentEmail(
          user.email,
          taskTitle,
          message.taskId,
          assignedBy || 'Someone'
        );
        break;
        
      case NotificationType.TASK_COMMENT:
        await emailService.sendTaskCommentEmail(
          user.email,
          taskTitle,
          message.taskId,
          commentedBy || 'Someone',
          commentContent || 'New comment on your task'
        );
        break;
        
      default:
        console.log(`SQS CONSUMER: Unknown notification type ${notificationType}, no email sent`);
    }
    
    console.log(`SQS CONSUMER: Successfully sent email notification of type ${notificationType} to ${user.email}`);
  }
};

export class QueueConsumerError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'QueueConsumerError';
  }
}

const processQueueMessage = async (message: QueueMessage): Promise<void> => {
  console.log(`QUEUE CONSUMER: Processing message with topic ${message.topic} and event type ${message.eventType}`);
  
  if (message.topic === TopicType.TASK_LOGGING) {
    if (message.eventType !== QueueEventType.USER_NOTIFICATION) {
      const handler = taskHistoryHandlers[message.eventType as keyof typeof taskHistoryHandlers];
      
      if (!handler) {
        throw new QueueConsumerError(`No task history handler found for event type: ${message.eventType}`);
      }
      
      console.log(`QUEUE CONSUMER: Processing task history event ${message.eventType}`);
      await handler(message);
      console.log(`QUEUE CONSUMER: Successfully processed ${message.eventType} event for task ${message.taskId}`);
    }
  } 
  else if (message.topic === TopicType.USER_NOTIFICATIONS) {
    console.log(`QUEUE CONSUMER: Processing user notification message for user ${message.userId}`);
    if (message.eventType === QueueEventType.USER_NOTIFICATION) {
      try {
        console.log(`QUEUE CONSUMER: Processing notification for user ${message.userId}`);
        await userNotificationHandlers[QueueEventType.USER_NOTIFICATION](message);
        console.log(`QUEUE CONSUMER: Successfully processed notification for user ${message.userId}`);
      } catch (error) {
        console.error(`QUEUE CONSUMER ERROR: Failed to process user notification:`, error);
        throw new QueueConsumerError(`Failed to process user notification for user ${message.userId}`, error);
      }
    } else {
      console.log(`QUEUE CONSUMER: Received non-USER_NOTIFICATION event type ${message.eventType} on USER_NOTIFICATIONS topic, ignoring`);
    }
  }
  else {
    console.log(`QUEUE CONSUMER: Unknown topic: ${message.topic}`);
  }
};

const processMessage = async (message: any, queueUrl: string): Promise<void> => {
  try {
    console.log(`QUEUE CONSUMER: Processing received message:`, message.MessageId);
    
    if (!message.Body) {
      throw new QueueConsumerError('Message body is empty');
    }

    const snsEnvelope = JSON.parse(message.Body);
    
    console.log(`QUEUE CONSUMER: Message from SNS Topic: ${snsEnvelope.TopicArn}`);
    
    if (!snsEnvelope.Message) {
      throw new QueueConsumerError('No Message field in SNS envelope');
    }

    console.log(`QUEUE CONSUMER: Raw message content: ${snsEnvelope.Message}`);
    const messageContent = JSON.parse(snsEnvelope.Message);
    console.log(`QUEUE CONSUMER: Message parsed, event type: ${messageContent.eventType}, topic: ${messageContent.topic}`);
    
    const queueMessage = QueueMessageSchema.parse(messageContent);
    await processQueueMessage(queueMessage);

    const deleteCommand = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: message.ReceiptHandle
    });
    console.log(`QUEUE CONSUMER: Deleting message ${message.MessageId} from queue`);
    await sqsClient.send(deleteCommand);
    console.log(`QUEUE CONSUMER: Message ${message.MessageId} deleted successfully`);
  } catch (error) {
    console.error(`QUEUE CONSUMER ERROR: Failed to process message:`, error);
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
      throw new QueueConsumerError('Invalid message format', error);
    }
    if (error instanceof QueueConsumerError) {
      throw error;
    }
    throw new QueueConsumerError('Failed to process message', error);
  }
};

const startConsumer = async (queueUrl: string): Promise<void> => {
  console.log(`Starting queue consumer...`);
  console.log(`QUEUE CONSUMER: Using queue URL: ${queueUrl}`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      console.log(`QUEUE CONSUMER: Polling for messages...`);
      const receiveCommand = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ['All'],
        AttributeNames: ['All']
      });

      const response = await sqsClient.send(receiveCommand);
      console.log(`QUEUE CONSUMER: Received ${response.Messages?.length || 0} messages`);
      
      if (response.Messages && response.Messages.length > 0) {
        console.log(`QUEUE CONSUMER: Message IDs: ${response.Messages.map(m => m.MessageId).join(', ')}`);
      } else {
        console.log(`QUEUE CONSUMER: Queue appears to be empty. Checking queue status...`);
        try {
          const attributesCmd = await sqsClient.send(new GetQueueAttributesCommand({
            QueueUrl: queueUrl,
            AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
          }));
          
          if (attributesCmd.Attributes) {
            console.log(`QUEUE CONSUMER: Queue has approximately ${attributesCmd.Attributes['ApproximateNumberOfMessages'] || 0} available messages and ${attributesCmd.Attributes['ApproximateNumberOfMessagesNotVisible'] || 0} in flight`);
          } else {
            console.log('QUEUE CONSUMER: Could not retrieve queue attributes');
          }
        } catch (error) {
          console.error(`QUEUE CONSUMER ERROR: Could not get queue attributes:`, error);
        }
      }

      if (!response.Messages || response.Messages.length === 0) {
        console.log(`QUEUE CONSUMER: No messages received, continuing polling`);
        continue;
      }

      console.log(`QUEUE CONSUMER: Processing ${response.Messages.length} messages`);
      await Promise.all(response.Messages.map(msg => processMessage(msg, queueUrl)));
    } catch (error) {
      console.error(`QUEUE CONSUMER ERROR: Error receiving messages:`, error);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
    }
  }
};

export const startQueueConsumer = async (): Promise<void> => {
  const config = configManager.getConfig();
  
  startConsumer(config.aws.sqsQueueUrl).catch(error => {
    console.error('Error starting queue consumer:', error);
  });
}; 