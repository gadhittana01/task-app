import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { configManager } from '../config/config';
import { z } from 'zod';

// Initialize SNS client
const snsClient = new SNSClient({
  region: configManager.getConfig().aws.region
});

// Message validation schema
const MessageSchema = z.object({
  message: z.string().min(1)
});

export class QueueError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'QueueError';
  }
}

export const publishMessage = async (message: string): Promise<void> => {
  try {
    // Validate input
    const validatedMessage = MessageSchema.parse({ message });
    const config = configManager.getConfig();

    const command = new PublishCommand({
      Message: validatedMessage.message,
      TopicArn: config.aws.snsTaskLoggingTopic
    });

    await snsClient.send(command);
    console.log('Message published successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new QueueError('Invalid message format', error);
    }
    if (error instanceof Error) {
      throw new QueueError('Failed to publish message to SNS', error);
    }
    throw new QueueError('An unknown error occurred while publishing message');
  }
};