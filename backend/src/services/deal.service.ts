import mongoose, { ClientSession, Types } from 'mongoose';
import { Deal, IDeal } from '../models/deal.model.js';
import { Listing } from '../models/listing.model.js';
import { Offer } from '../models/offer.model.js';
import { User } from '../models/user.model.js';
import { ListingStatus, OfferStatus } from '../constants/enums.js';
import { ConflictError } from '../errors/HttpErrors.js';
import { ErrorCodes } from '../constants/errorCodes.js';

/**
 * Core deal closure operations (runs with or without a session).
 */
async function runDealOps(
  listingId: Types.ObjectId,
  sellerId: Types.ObjectId,
  buyerId: Types.ObjectId,
  finalPrice: number,
  offerId: Types.ObjectId | null,
  session?: ClientSession
): Promise<IDeal> {
  const opts = session ? { session } : {};

  // 1. Mark listing as SOLD — unique guard against concurrent closures
  const updatedListing = await Listing.findOneAndUpdate(
    {
      _id: listingId,
      status: { $in: [ListingStatus.ACTIVE, ListingStatus.UNDER_OFFER] }
    },
    { $set: { status: ListingStatus.SOLD, soldToBuyerId: buyerId } },
    { ...opts, new: true }
  );

  if (!updatedListing) {
    throw new ConflictError(
      'This listing has already been sold or is unavailable',
      ErrorCodes.DEAL_ALREADY_CLOSED
    );
  }

  // 2. Create the Deal record
  const deals = await Deal.create(
    [{ listingId, offerId: offerId ?? null, sellerId, buyerId, finalPrice }],
    opts
  );
  const createdDeal = deals[0];

  // 3. Increment totalDealsCompleted for both participants
  await User.updateMany(
    { _id: { $in: [sellerId, buyerId] } },
    { $inc: { totalDealsCompleted: 1 } },
    opts
  );

  // 4. Decline all other pending offers for this listing (except the accepted one)
  const excludeOfferId = offerId ?? new Types.ObjectId();
  await Offer.updateMany(
    { listingId, status: OfferStatus.PENDING, _id: { $ne: excludeOfferId } },
    { $set: { status: OfferStatus.DECLINED } },
    opts
  );

  return createdDeal;
}

/**
 * Executes an atomic (ACID) deal closure.
 * Uses a transaction when a replica set is available; falls back to sequential
 * operations guarded by the unique `listingId` index on the Deal collection.
 *
 * Operations:
 *  1. Transition listing → SOLD (idempotency guard)
 *  2. Create Deal document
 *  3. Increment totalDealsCompleted for both seller and buyer
 *  4. Decline competing pending offers
 */
export async function executeAtomicDealClosure(
  listingId: Types.ObjectId,
  sellerId: Types.ObjectId,
  buyerId: Types.ObjectId,
  finalPrice: number,
  session: ClientSession,
  offerId?: Types.ObjectId | null
): Promise<IDeal> {
  try {
    let result: IDeal | undefined;

    await session.withTransaction(async () => {
      result = await runDealOps(listingId, sellerId, buyerId, finalPrice, offerId ?? null, session);
    });

    if (!result) {
      throw new ConflictError(
        'Deal closure transaction failed unexpectedly',
        ErrorCodes.DEAL_ALREADY_CLOSED
      );
    }

    return result;
  } catch (err: any) {
    // If the error is from our own ConflictError, re-throw it directly
    if (err.statusCode || err.isOperational) {
      throw err;
    }
    // Replica set not available — try without transaction
    if (
      err.codeName === 'IllegalOperation' ||
      err.message?.includes('Transaction') ||
      err.message?.includes('replica') ||
      err.message?.includes('not supported')
    ) {
      return runDealOps(listingId, sellerId, buyerId, finalPrice, offerId ?? null);
    }
    throw err;
  }
}

/**
 * Opens a new Mongoose client session suitable for ACID transactions.
 */
export async function startDealSession(): Promise<ClientSession> {
  return mongoose.startSession();
}
