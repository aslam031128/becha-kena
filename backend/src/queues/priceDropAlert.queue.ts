import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const PRICE_DROP_ALERT_QUEUE_NAME = 'price-drop-alert';

export interface PriceDropAlertJobData {
  listingId: string;
  oldPrice: number;
  newPrice: number;
}

export const priceDropAlertQueue = new Queue<PriceDropAlertJobData>(
  PRICE_DROP_ALERT_QUEUE_NAME,
  {
    connection: getRedisClient(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: 1000
    }
  }
);

/**
 * Enqueues a debounced price drop alert.
 * 
 * Uses jobId `price_drop:${listingId}` with a 5-minute debounce window.
 * If the seller modifies the price multiple times within 5 minutes,
 * this function removes the delayed job and schedules the latest price drop.
 * 
 * @param listingId - Listing ObjectId string
 * @param oldPrice - Previous listing price in BDT
 * @param newPrice - Discounted new price in BDT
 * @param delayMs - Debounce window in milliseconds (default: 5 minutes)
 */
export const schedulePriceDropAlert = async (
  listingId: string,
  oldPrice: number,
  newPrice: number,
  delayMs: number = 5 * 60 * 1000
) => {
  const jobId = `price_drop:${listingId}`;

  // Debouncing: check if a job is already waiting in delay
  try {
    const existingJob = await priceDropAlertQueue.getJob(jobId);
    if (existingJob) {
      const isDelayed = await existingJob.isDelayed();
      if (isDelayed) {
        await existingJob.remove();
        logger.info(`[PriceDropAlertQueue] ⏳ Debounced prior pending alert for listing ${listingId}`);
      }
    }
  } catch (err: any) {
    logger.warn(`[PriceDropAlertQueue] Error checking existing debounced job: ${err.message}`);
  }

  logger.info(
    `[PriceDropAlertQueue] Enqueuing price-drop alert for listing ${listingId} (BDT ${oldPrice} -> ${newPrice}) with ${delayMs / 1000}s debounce window.`
  );

  return priceDropAlertQueue.add(
    'price-drop',
    { listingId, oldPrice, newPrice },
    {
      jobId,
      delay: delayMs
    }
  );
};
