import { createClient } from 'redis';
import { configManager } from '../config/config';

const config = configManager.getConfig();

// Create Redis client with default commands
const client = createClient({
  url: config.database.redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 100, 3000);
      return delay;
    }
  }
});

// Handle connection events
client.on('connect', () => {
  console.log('✅ Connected to Redis Cloud');
});

client.on('ready', async () => {
  try {
    await client.ping();
    console.log('Redis PING successful');
  } catch (err) {
    console.error('Redis PING failed:', err);
  }
});

client.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
  if (err.message.includes('ECONNREFUSED')) {
    console.error('Connection refused - Redis server might be down or unreachable');
  } else if (err.message.includes('ETIMEDOUT')) {
    console.error('Connection timed out - Network issues or Redis server overloaded');
  }
});

client.on('reconnecting', () => {
  console.log('🔄 Reconnecting to Redis...');
});

client.on('end', () => {
  console.log('⚠️ Redis connection ended');
});

// Initialize Redis connection
const initRedis = async () => {
  try {
    await client.connect();
    return client;
  } catch (err) {
    console.error('Failed to initialize Redis connection:', err);
    throw err;
  }
};

export const getRedisClient = () => client;
export default initRedis;
