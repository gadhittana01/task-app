import mongoose, { Connection } from 'mongoose';
import { getRedisClient } from './redis';
import { config } from '../config/config';

class Database {
  private static instance: Database;
  private mongoClient: Connection | null = null;
  private redisClient: any = null;
  private isMongoConnected = false;
  private isRedisConnected = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connectMongoDB(): Promise<void> {
    if (this.isMongoConnected) {
      return;
    }

    try {
      const mongoURI = config.database.mongoUri;
      if (!mongoURI) {
        throw new Error('MongoDB URI is not configured');
      }

      const conn = await mongoose.connect(mongoURI);
      this.mongoClient = conn.connection;
      this.isMongoConnected = true;
    } catch (error) {
      // Re-throw the error to be handled by the caller
      throw new Error(`Error connecting to MongoDB: ${error}`);
    }
  }

  public async connectRedis(): Promise<void> {
    if (this.isRedisConnected) {
      return;
    }

    try {
      this.redisClient = getRedisClient();
      if (this.redisClient && !this.redisClient.isOpen) {
        await this.redisClient.connect();
      }
      if (this.redisClient) {
        await this.redisClient.ping();
        this.isRedisConnected = true;
      }
    } catch (error) {
      throw new Error(`Redis connection error: ${error}`);
    }
  }

  public async disconnectMongoDB(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
      this.mongoClient = null;
      this.isMongoConnected = false;
    }
  }

  public async disconnectRedis(): Promise<void> {
    if (this.redisClient && this.isRedisConnected) {
      await this.redisClient.quit();
      this.redisClient = null;
      this.isRedisConnected = false;
    }
  }

  public getMongoClient(): Connection | null {
    return this.mongoClient;
  }

  public getRedisClient(): any {
    return this.redisClient;
  }
}

export const database = Database.getInstance();

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = config.database.mongoUri;
    if (!mongoURI) {
      throw new Error('MongoDB URI is not configured');
    }

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
  } catch (error) {
    throw new Error(`Error connecting to MongoDB: ${error}`);
  }
};
