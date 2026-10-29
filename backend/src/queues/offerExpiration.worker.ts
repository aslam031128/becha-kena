import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { OFFER_EXPIRATION_QUEUE_NAME, OfferExpirationJobData } from './offerExpiration.queue.js';
import { Offer } from '../models/offer.model.js';
import { Message } from '../models/message.model.js';
import { OfferStatus, MessageType } from '../constants/enums.js';
import { logger } from '../utils/logger.js';
import { getSocketServer } from '../sockets/socketServer.js';

export const processOfferExpiration = async (
  job: Job<OfferExpirationJobData>
): Promise<{ offerId: string; status: string; expired: boolean }> => {
  const { offerId } = job.data;
  logger.info(`[OfferExpirationWorker] Evaluating expiration for offer ID: ${offerId}`);

  // Atomically check if pending and update status to expired
  const updatedOffer = await Offer.findOneAndUpdate(
    { _id: offerId, status: OfferStatus.PENDING },
    { $set: { status: OfferStatus.EXPIRED } },
    { new: true }
  );

  if (!updatedOffer) {
    logger.info(
      `[OfferExpirationWorker] Offer ${offerId} was not pending (already accepted, countered, declined, or expired).`
    );
    return { offerId, status: 'already_resolved_or_not_found', expired: false };
  }

  logger.info(`[OfferExpirationWorker] ✅ Atomically transitioned offer ${offerId} to EXPIRED.`);

  // Create an automated chat message in the negotiation thread
  try {
    await Message.create({
      conversationId: updatedOffer.conversationId,
      senderId: updatedOffer.buyerId,
      text: 'Offer has expired after 24 hours without acceptance.',
      messageType: MessageType.OFFER_EVENT
    });
  } catch (err: any) {
    logger.warn(`[OfferExpirationWorker] Failed to create offer expiry chat message: ${err.message}`);
  }

  // Real-time notification to the buyer and conversation room via Socket.io
  try {
    const io = getSocketServer();
    io.to(`conversation:${updatedOffer.conversationId}`).emit('offer:expired', {
      offerId: updatedOffer._id,
      conversationId: updatedOffer.conversationId,
      status: OfferStatus.EXPIRED
    });

    io.to(`user:${updatedOffer.buyerId}`).emit('notification:offer_expired', {
      offerId: updatedOffer._id,
      conversationId: updatedOffer.conversationId,
      listingId: updatedOffer.listingId,
      message: 'Your offer has expired after 24 hours without response.'
    });
  } catch (socketErr: any) {
    logger.debug(`[OfferExpirationWorker] Socket notification skipped: ${socketErr.message}`);
  }

  return { offerId, status: OfferStatus.EXPIRED, expired: true };
};

export const offerExpirationWorker = new Worker<OfferExpirationJobData>(
  OFFER_EXPIRATION_QUEUE_NAME,
  processOfferExpiration,
  {
    connection: getRedisClient(),
    concurrency: 5
  }
);

offerExpirationWorker.on('completed', (job: Job) => {
  logger.info(`[OfferExpirationWorker] Job ${job.id} completed successfully.`);
});

offerExpirationWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`[OfferExpirationWorker] Job ${job?.id} failed: ${err.message}`);
});
