import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { LISTING_LIFECYCLE_QUEUE_NAME, ListingLifecycleJobData } from './listingLifecycle.queue.js';
import { Listing } from '../models/listing.model.js';
import { ListingStatus } from '../constants/enums.js';
import { logger } from '../utils/logger.js';

export const processListingLifecycle = async (
  job: Job<ListingLifecycleJobData>
): Promise<{ expiredCount: number; timestamp: string }> => {
  logger.info(`[ListingLifecycleWorker] ⏰ Running hourly sweep for expired listings (Job ID: ${job.id})...`);

  const now = new Date();

  // Atomically update all active listings whose 30-day lifecycle has ended (expiresAt < now)
  const result = await Listing.updateMany(
    {
      status: ListingStatus.ACTIVE,
      expiresAt: { $lt: now }
    },
    {
      $set: { status: ListingStatus.EXPIRED }
    }
  );

  logger.info(
    `[ListingLifecycleWorker] 🧹 Expired ${result.modifiedCount} listing(s) whose 30-day lifecycle concluded.`
  );

  return {
    expiredCount: result.modifiedCount,
    timestamp: now.toISOString()
  };
};

export const listingLifecycleWorker = new Worker<ListingLifecycleJobData>(
  LISTING_LIFECYCLE_QUEUE_NAME,
  processListingLifecycle,
  {
    connection: getRedisClient(),
    concurrency: 1
  }
);

listingLifecycleWorker.on('completed', (job: Job) => {
  logger.info(`[ListingLifecycleWorker] Lifecycle sweep job ${job.id} completed successfully.`);
});

listingLifecycleWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`[ListingLifecycleWorker] Lifecycle sweep job ${job?.id} failed: ${err.message}`);
});
