import { Redis, RedisOptions } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export const getRedisOptions = (): RedisOptions => {
  return {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times: number) {
      if (times > 3) return null; // Stop reconnecting after 3 attempts in local dev
      const delay = Math.min(Math.pow(2, Math.min(times, 8)) * 100, 3000);
      logger.warn(`⚠️ Redis reconnect attempt #${times}, retrying in ${delay}ms...`);
      return delay;
    }
  };
};

export const attachMemoryFallback = (client: Redis): void => {
  const memoryStore = new Map<string, { value: string; expiresAt?: number }>();

  client.get = (async (key: string) => {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  }) as any;

  client.set = (async (key: string, value: string, mode?: any, duration?: any) => {
    let expiresAt: number | undefined;
    if (mode === 'EX' && typeof duration === 'number') {
      expiresAt = Date.now() + duration * 1000;
    } else if (mode === 'PX' && typeof duration === 'number') {
      expiresAt = Date.now() + duration;
    }
    memoryStore.set(key, { value: String(value), expiresAt });
    return 'OK';
  }) as any;

  client.del = (async (...keys: string[]) => {
    let count = 0;
    for (const key of keys) {
      if (memoryStore.delete(key)) count++;
    }
    return count;
  }) as any;

  client.incr = (async (key: string) => {
    const item = memoryStore.get(key);
    let val = item ? parseInt(item.value, 10) : 0;
    if (isNaN(val)) val = 0;
    val += 1;
    memoryStore.set(key, { value: String(val), expiresAt: item?.expiresAt });
    return val;
  }) as any;

  client.expire = (async (key: string, seconds: number) => {
    const item = memoryStore.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }) as any;

  client.ttl = (async (key: string) => {
    const item = memoryStore.get(key);
    if (!item) return -2;
    if (!item.expiresAt) return -1;
    const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }) as any;

  client.call = (async () => {
    return 1 as any;
  }) as any;
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
      if (env.NODE_ENV === 'production') {
        logger.warn('⚠️ Redis Client connection closed.');
      }
    });

    redisClient.on('end', () => {
      if (env.NODE_ENV === 'production') {
        logger.warn('🛑 Redis Client connection ended.');
      }
    });

    redisClient.on('error', (err: Error) => {
      if (env.NODE_ENV === 'production') {
        logger.error(`❌ Redis Client Error: ${err.message}`);
      }
    });

    // In development or test environments, always attach in-memory fallback so app never hangs
    if (env.NODE_ENV === 'test' || env.NODE_ENV === 'development') {
      attachMemoryFallback(redisClient);
    }
  }

  return redisClient;
};

// Singleton export
export const redis = getRedisClient();

export const connectRedis = async (): Promise<Redis> => {
  const client = getRedisClient();
  if (env.NODE_ENV === 'development') {
    logger.info('ℹ️ Redis cache running in fast in-memory mode for local development.');
    return client;
  }

  try {
    if (client.status !== 'ready' && client.status !== 'connecting') {
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection attempt timed out after 3000ms')), 3000)
      );
      await Promise.race([connectPromise, timeoutPromise]);
    }
    return client;
  } catch (error: any) {
    logger.warn(`⚠️ Redis initial connection deferred: ${error.message}. Retrying in background...`);
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
