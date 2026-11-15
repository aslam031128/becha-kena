import { logger } from '../utils/logger.js';
import {
  offerExpirationQueue,
  scheduleOfferExpiration,
  cancelOfferExpiration,
  OFFER_EXPIRATION_QUEUE_NAME
} from './offerExpiration.queue.js';
import { offerExpirationWorker, processOfferExpiration } from './offerExpiration.worker.js';

import {
  priceDropAlertQueue,
  schedulePriceDropAlert,
  PRICE_DROP_ALERT_QUEUE_NAME
} from './priceDropAlert.queue.js';
import { priceDropAlertWorker, processPriceDropAlert } from './priceDropAlert.worker.js';

import {
  listingLifecycleQueue,
  initListingLifecycleCron,
  LISTING_LIFECYCLE_QUEUE_NAME
} from './listingLifecycle.queue.js';
import { listingLifecycleWorker, processListingLifecycle } from './listingLifecycle.worker.js';

import {
  mediaProcessingQueue,
  scheduleVideoProcessing,
  MEDIA_PROCESSING_QUEUE_NAME
} from './mediaProcessing.queue.js';
import { initMediaProcessingWorker } from './mediaProcessing.worker.js';

import {
  orphanCleanupQueue,
  initOrphanCleanupCron,
  initOrphanCleanupWorker,
  ORPHAN_CLEANUP_QUEUE_NAME
} from './orphanCleanup.worker.js';

export {
  // Queues
  offerExpirationQueue,
  priceDropAlertQueue,
  listingLifecycleQueue,
  mediaProcessingQueue,
  orphanCleanupQueue,
  // Schedulers
  scheduleOfferExpiration,
  cancelOfferExpiration,
  schedulePriceDropAlert,
  initListingLifecycleCron,
  scheduleVideoProcessing,
  initOrphanCleanupCron,
  // Processors
  processOfferExpiration,
  processPriceDropAlert,
  processListingLifecycle,
  // Workers
  offerExpirationWorker,
  priceDropAlertWorker,
  listingLifecycleWorker,
  initMediaProcessingWorker,
  initOrphanCleanupWorker,
  // Queue Names
  OFFER_EXPIRATION_QUEUE_NAME,
  PRICE_DROP_ALERT_QUEUE_NAME,
  LISTING_LIFECYCLE_QUEUE_NAME,
  MEDIA_PROCESSING_QUEUE_NAME,
  ORPHAN_CLEANUP_QUEUE_NAME
};

/**
 * Initializes all repeatable queues and background workers.
 */
export const initQueues = async (): Promise<void> => {
  try {
    logger.info('📦 Initializing BullMQ queues and workers...');
    await initListingLifecycleCron();
    await initOrphanCleanupCron();
    initMediaProcessingWorker();
    initOrphanCleanupWorker();
    logger.info('✅ BullMQ queues and workers successfully initialized.');
  } catch (error: any) {
    logger.error(`⚠️ Failed to initialize repeatable BullMQ crons: ${error.message}`);
  }
};

/**
 * Gracefully pauses and closes all BullMQ workers and queues.
 */
export const closeQueues = async (): Promise<void> => {
  logger.info('🛑 Closing BullMQ workers and queues...');

  try {
    await Promise.allSettled([
      offerExpirationWorker.close(),
      priceDropAlertWorker.close(),
      listingLifecycleWorker.close()
    ]);

    await Promise.allSettled([
      offerExpirationQueue.close(),
      priceDropAlertQueue.close(),
      listingLifecycleQueue.close(),
      mediaProcessingQueue.close(),
      orphanCleanupQueue.close()
    ]);

    logger.info('✅ All BullMQ workers and queues closed cleanly.');
  } catch (error: any) {
    logger.error(`Error closing BullMQ queues: ${error.message}`);
  }
};
