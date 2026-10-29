import { Redis, RedisOptions } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export const getRedisOptions = (): RedisOptions => {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times: number) {
      const delay = Math.min(Math.pow(2, Math.min(times, 8)) * 100, 5000);
      logger.warn(`⚠️ Redis reconnect attempt #${times}, retrying in ${delay}ms...`);
      return delay;
    }
  };
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, getRedisOptions());

    redisClient.on('connect', () => {
      logger.info('🔌 Redis Client connecting...');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis Client is ready and connected.');
    });

    redisClient.on('reconnecting', (delay: number) => {
      logger.info(`🔄 Redis Client reconnecting in ${delay}ms...`);
    });

    redisClient.on('close', () => {
      logger.warn('⚠️ Redis Client connection closed.');
    });

    redisClient.on('end', () => {
      logger.warn('🛑 Redis Client connection ended.');
    });

    redisClient.on('error', (err: Error) => {
      logger.error(`❌ Redis Client Error: ${err.message}`);
    });

    // In automated unit test environments, attach in-memory key-value fallback
    if (env.NODE_ENV === 'test') {
      const memoryStore = new Map<string, { value: string; expiresAt?: number }>();

      redisClient.get = (async (key: string) => {
        const item = memoryStore.get(key);
        if (!item) return null;
        if (item.expiresAt && Date.now() > item.expiresAt) {
          memoryStore.delete(key);
          return null;
        }
        return item.value;
      }) as any;

      redisClient.set = (async (key: string, value: string, mode?: any, duration?: any) => {
        let expiresAt: number | undefined;
        if (mode === 'EX' && typeof duration === 'number') {
          expiresAt = Date.now() + duration * 1000;
        } else if (mode === 'PX' && typeof duration === 'number') {
          expiresAt = Date.now() + duration;
        }
        memoryStore.set(key, { value: String(value), expiresAt });
        return 'OK';
      }) as any;

      redisClient.del = (async (...keys: string[]) => {
        let count = 0;
        for (const key of keys) {
          if (memoryStore.delete(key)) count++;
        }
        return count;
      }) as any;

      redisClient.ttl = (async (key: string) => {
        const item = memoryStore.get(key);
        if (!item) return -2;
        if (!item.expiresAt) return -1;
        const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
      }) as any;
    }
  }

  return redisClient;
};

// Singleton export
export const redis = getRedisClient();

export const connectRedis = async (): Promise<Redis> => {
  const client = getRedisClient();
  try {
    if (client.status !== 'ready' && client.status !== 'connecting') {
      await client.connect();
    }
    return client;
  } catch (error: any) {
    logger.warn(`⚠️ Redis initial connection failed: ${error.message}. Retrying in background...`);
    return client;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      if (redisClient.status !== 'end') {
        await redisClient.quit();
      }
      logger.info('Redis client disconnected gracefully.');
    } catch (error: any) {
      logger.error(`Error disconnecting Redis: ${error.message}`);
    } finally {
      redisClient = null;
    }
  }
};
