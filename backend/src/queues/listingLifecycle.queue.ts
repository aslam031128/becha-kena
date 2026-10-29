import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const LISTING_LIFECYCLE_QUEUE_NAME = 'listing-lifecycle';

export interface ListingLifecycleJobData {
  triggeredAt?: string;
}

export const listingLifecycleQueue = new Queue<ListingLifecycleJobData>(
  LISTING_LIFECYCLE_QUEUE_NAME,
  {
    connection: getRedisClient(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      removeOnFail: 1000
    }
  }
);

/**
 * Initializes the repeatable hourly cron job that monitors and expires 30-day listings.
 * 
 * Pattern: `0 * * * *` (hourly at minute 0).
 */
export const initListingLifecycleCron = async () => {
  logger.info('[ListingLifecycleQueue] Registering repeatable cron job: hourly listing expiry check (0 * * * *)...');
  return listingLifecycleQueue.add(
    'expire-active-listings',
    { triggeredAt: new Date().toISOString() },
    {
      repeat: {
        pattern: '0 * * * *'
      },
      jobId: 'hourly-listing-lifecycle'
    }
  );
};
