import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { PRICE_DROP_ALERT_QUEUE_NAME, PriceDropAlertJobData } from './priceDropAlert.queue.js';
import { Listing } from '../models/listing.model.js';
import { Favorite } from '../models/favorite.model.js';
import { IUser } from '../models/user.model.js';
import { ListingStatus } from '../constants/enums.js';
import { logger } from '../utils/logger.js';
import { getSocketServer } from '../sockets/socketServer.js';

export const processPriceDropAlert = async (
  job: Job<PriceDropAlertJobData>
): Promise<{ listingId: string; alertsDispatched: number; eligibleCount: number }> => {
  const { listingId, oldPrice, newPrice } = job.data;
  logger.info(
    `[PriceDropAlertWorker] 📉 Processing price drop: Listing ${listingId} reduced from BDT ${oldPrice} to BDT ${newPrice}`
  );

  // 1. Ensure the listing still exists and is currently active
  const listing = await Listing.findById(listingId);
  if (!listing || listing.status !== ListingStatus.ACTIVE) {
    logger.info(
      `[PriceDropAlertWorker] Listing ${listingId} is not active (status: ${listing?.status || 'NOT_FOUND'}). Skipping alerts.`
    );
    return { listingId, alertsDispatched: 0, eligibleCount: 0 };
  }

  // 2. Query all favorites where priceAtSave is higher than newPrice
  const favorites = await Favorite.find({
    listingId,
    priceAtSave: { $gt: newPrice }
  }).populate<{ userId: IUser }>('userId');

  let alertsDispatched = 0;

  for (const fav of favorites) {
    const user = fav.userId;

    // 3. User filter: active citizen with priceDropAlerts preference enabled
    if (
      user &&
      !user.isBanned &&
      !user.isFrozen &&
      user.notificationPreferences?.priceDropAlerts === true
    ) {
      alertsDispatched++;
      logger.info(
        `[PriceDropAlertWorker] 🔔 Price drop notification sent to user ${user._id} (${user.phone}) for "${listing.title}". Benchmark: BDT ${fav.priceAtSave}, Now: BDT ${newPrice}`
      );

      // 4. Real-time push / socket alert
      try {
        const io = getSocketServer();
        io.to(`user:${user._id}`).emit('notification:price_drop', {
          listingId: listing._id,
          title: listing.title,
          oldPrice,
          newPrice,
          priceAtSave: fav.priceAtSave,
          savings: fav.priceAtSave - newPrice,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        logger.debug(`[PriceDropAlertWorker] Socket notification skipped: ${err.message}`);
      }
    }
  }

  logger.info(
    `[PriceDropAlertWorker] Finished processing listing ${listingId}. Dispatched ${alertsDispatched} alert(s) across ${favorites.length} saved benchmark(s).`
  );

  return { listingId, alertsDispatched, eligibleCount: favorites.length };
};

export const priceDropAlertWorker = new Worker<PriceDropAlertJobData>(
  PRICE_DROP_ALERT_QUEUE_NAME,
  processPriceDropAlert,
  {
    connection: getRedisClient(),
    concurrency: 5
  }
);

priceDropAlertWorker.on('completed', (job: Job) => {
  logger.info(`[PriceDropAlertWorker] Job ${job.id} completed successfully.`);
});

priceDropAlertWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`[PriceDropAlertWorker] Job ${job?.id} failed: ${err.message}`);
});
