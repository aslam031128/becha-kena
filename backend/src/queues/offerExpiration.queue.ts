import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const OFFER_EXPIRATION_QUEUE_NAME = 'offer-expiration';

export interface OfferExpirationJobData {
  offerId: string;
}

export const offerExpirationQueue = new Queue<OfferExpirationJobData>(
  OFFER_EXPIRATION_QUEUE_NAME,
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
 * Schedules a delayed job to expire an offer after 24 hours.
 * 
 * @param offerId - The MongoDB ObjectId string of the offer.
 * @param delayMs - Delay duration in milliseconds (default: 24 hours).
 */
export const scheduleOfferExpiration = async (
  offerId: string,
  delayMs: number = 24 * 60 * 60 * 1000
) => {
  logger.info(`[OfferExpirationQueue] Scheduling offer expiration for ${offerId} in ${delayMs / 1000}s`);
  return offerExpirationQueue.add(
    'expire-offer',
    { offerId },
    {
      jobId: `offer_expire:${offerId}`,
      delay: delayMs
    }
  );
};
