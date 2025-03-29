import dotenv from 'dotenv';

interface DatabaseConfig {
  mongoUri: string;
  redisUrl: string;
}

interface AwsConfig {
  region: string;
  snsTaskLoggingTopic: string;
  snsUserNotificationsTopic: string;
  sqsQueueUrl: string;
}

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
}

interface AppConfig {
  env: string;
  port: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

interface Config extends AppConfig {
  database: DatabaseConfig;
  aws: AwsConfig;
  email: EmailConfig;
  auth: AuthConfig;
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: Config | null = null;

  private constructor() {
    dotenv.config();
    console.log('Environment variables loaded:', {
      MONGODB_URI: process.env.MONGODB_URI ? 'Present' : 'Missing',
      REDIS_URL: process.env.REDIS_URL ? 'Present' : 'Missing',
      JWT_SECRET: process.env.JWT_SECRET ? 'Present' : 'Missing',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ? 'Present' : 'Missing',
      AWS_REGION: process.env.AWS_REGION ? 'Present' : 'Missing',
      SNS_TASK_LOGGING_TOPIC: process.env.SNS_TASK_LOGGING_TOPIC ? 'Present' : 'Missing',
      SNS_USER_NOTIFICATIONS_TOPIC: process.env.SNS_USER_NOTIFICATIONS_TOPIC ? 'Present' : 'Missing'
    });
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): Config {
    if (!this.config) {
      this.config = this.loadConfig();
    }
    return this.config;
  }

  private loadConfig(): Config {
    // Ensure MongoDB URI has a database name
    let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/task-app';
    
    // Check if URI already has a database name
    if (mongoUri.includes('mongodb+srv://') && !mongoUri.includes('mongodb+srv://user:pass@host/dbname')) {
      if (!mongoUri.includes('/?')) {
        mongoUri += '/task-app';
      } else if (!mongoUri.match(/\/[^\/]+\?/)) {
        mongoUri = mongoUri.replace('/?', '/task-app?');
      }
    }
    
    return {
      env: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      
      database: {
        mongoUri,
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      },
      
      aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        snsTaskLoggingTopic: process.env.SNS_TASK_LOGGING_TOPIC || '',
        snsUserNotificationsTopic: process.env.SNS_USER_NOTIFICATIONS_TOPIC || '',
        sqsQueueUrl: process.env.SQS_QUEUE_URL || '',
      },
      
      email: {
        host: process.env.EMAIL_HOST || '',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
        from: process.env.EMAIL_FROM || '',
      },
      
      auth: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
        jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }
    };
  }
}

export const configManager = ConfigManager.getInstance();

// For backward compatibility with existing imports
export const config = configManager.getConfig();