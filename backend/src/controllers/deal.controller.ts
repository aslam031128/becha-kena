import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Deal, Offer, Listing, Conversation } from '../models/index.js';
import { OfferStatus } from '../constants/enums.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { ForbiddenError, NotFoundError, ConflictError } from '../errors/HttpErrors.js';
import { BadRequestError } from '../errors/ValidationError.js';
import { sendSuccess } from '../utils/response.js';
import { executeAtomicDealClosure, startDealSession } from '../services/deal.service.js';

// ---------------------------------------------------------------------------
// POST /api/v1/deals
// Closes a deal from an accepted offer — called by the seller.
// ---------------------------------------------------------------------------
export const closeDeal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { offerId } = req.body;

    if (!offerId || !mongoose.Types.ObjectId.isValid(offerId as string)) {
      throw new BadRequestError('A valid offerId is required', ErrorCodes.VALIDATION_ERROR);
    }

    const offer = await Offer.findById(offerId as string);
    if (!offer) {
      throw new NotFoundError('Offer not found', ErrorCodes.OFFER_NOT_FOUND);
    }

    if (offer.status !== OfferStatus.ACCEPTED) {
      throw new ConflictError(
        'Only accepted offers can be converted to a deal',
        ErrorCodes.OFFER_ALREADY_RESOLVED
      );
    }

    if (offer.sellerId.toString() !== userId) {
      throw new ForbiddenError(
        'Only the seller can close a deal from this offer',
        ErrorCodes.UNAUTHORIZED_DEAL_ACTION
      );
    }

    const session = await startDealSession();
    let deal;
    try {
      deal = await executeAtomicDealClosure(
        offer.listingId,
        offer.sellerId,
        offer.buyerId,
        offer.amount,
        session,
        offer._id
      );
    } finally {
      await session.endSession();
    }

    sendSuccess(
      res,
      {
        dealId: deal._id.toString(),
        listingId: deal.listingId.toString(),
        sellerId: deal.sellerId.toString(),
        buyerId: deal.buyerId.toString(),
        finalPrice: deal.finalPrice,
        completedAt: deal.completedAt
      },
      201,
      'Deal closed successfully'
    );
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/deals/direct-sale
// Seller-initiated direct sale (no prior offer, but active conversation must exist).
// ---------------------------------------------------------------------------
export const directSale = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { listingId, buyerId, finalPrice } = req.body;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId as string)) {
      throw new BadRequestError('A valid listingId is required', ErrorCodes.VALIDATION_ERROR);
    }
    if (!buyerId || !mongoose.Types.ObjectId.isValid(buyerId as string)) {
      throw new BadRequestError('A valid buyerId is required', ErrorCodes.VALIDATION_ERROR);
    }
    if (typeof finalPrice !== 'number' || finalPrice < 50) {
      throw new BadRequestError('finalPrice must be at least 50 BDT', ErrorCodes.VALIDATION_ERROR);
    }

    // Verify caller is the listing's seller
    const listing = await Listing.findById(listingId as string);
    if (!listing) {
      throw new NotFoundError('Listing not found', ErrorCodes.LISTING_NOT_FOUND);
    }
    if (listing.sellerId.toString() !== userId) {
      throw new ForbiddenError(
        'Only the listing owner can initiate a direct sale',
        ErrorCodes.UNAUTHORIZED_DEAL_ACTION
      );
    }

    // Anti-phantom-deal: verify an active conversation exists between seller and buyer
    const conversation = await Conversation.findOne({
      listingId: new mongoose.Types.ObjectId(listingId as string),
      buyerId: new mongoose.Types.ObjectId(buyerId as string),
      sellerId: new mongoose.Types.ObjectId(userId)
    });
    if (!conversation) {
      throw new ForbiddenError(
        'No conversation exists between seller and this buyer for this listing. Direct sale is not permitted.',
        ErrorCodes.CONVERSATION_NOT_FOUND
      );
    }

    const session = await startDealSession();
    let deal;
    try {
      deal = await executeAtomicDealClosure(
        new mongoose.Types.ObjectId(listingId as string),
        listing.sellerId,
        new mongoose.Types.ObjectId(buyerId as string),
        finalPrice as number,
        session,
        null
      );
    } finally {
      await session.endSession();
    }

    sendSuccess(
      res,
      {
        dealId: deal._id.toString(),
        listingId: deal.listingId.toString(),
        sellerId: deal.sellerId.toString(),
        buyerId: deal.buyerId.toString(),
        finalPrice: deal.finalPrice,
        completedAt: deal.completedAt
      },
      201,
      'Direct sale completed successfully'
    );
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/deals
// Retrieves all deals for the authenticated user (as buyer or seller)
// ---------------------------------------------------------------------------
export const getDeals = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const deals = await Deal.find({
      $or: [{ sellerId: userId }, { buyerId: userId }]
    })
      .sort({ completedAt: -1 })
      .populate('listingId', 'title imageUrls')
      .populate('sellerId', 'displayName isNidVerified')
      .populate('buyerId', 'displayName isNidVerified');

    const formattedDeals = deals.map((deal) => {
      const listing = (deal.listingId as any) || {};
      const seller = (deal.sellerId as any) || {};
      const buyer = (deal.buyerId as any) || {};
      const completedDate = deal.completedAt || new Date();
      const reviewWindowExpiresAt = new Date(
        new Date(completedDate).getTime() + 48 * 60 * 60 * 1000
      ).toISOString();

      return {
        id: deal._id.toString(),
        dealReceiptNumber: `BK-${deal._id.toString().slice(-6).toUpperCase()}`,
        listingId: listing._id ? listing._id.toString() : deal.listingId.toString(),
        listingTitle: listing.title || 'Untitled Listing',
        listingImageUrl: listing.imageUrls?.[0] || '',
        sellerId: seller._id ? seller._id.toString() : deal.sellerId.toString(),
        sellerName: seller.displayName || 'Seller',
        sellerVerified: !!seller.isNidVerified,
        buyerId: buyer._id ? buyer._id.toString() : deal.buyerId.toString(),
        buyerName: buyer.displayName || 'Buyer',
        buyerVerified: !!buyer.isNidVerified,
        finalPrice: deal.finalPrice,
        status: 'completed',
        disputeStatus: deal.disputeStatus || 'none',
        sellerReviewed: !!deal.isReviewedBySeller,
        buyerReviewed: !!deal.isReviewedByBuyer,
        reviewWindowExpiresAt,
        completedAt: completedDate.toISOString ? completedDate.toISOString() : new Date(completedDate).toISOString()
      };
    });

    sendSuccess(res, formattedDeals, 200, 'Deals retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/deals/:dealId
// Retrieves a populated deal receipt — only accessible by the two participants.
// ---------------------------------------------------------------------------
export const getDeal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const dealId = req.params.dealId as string;

    if (!dealId || !mongoose.Types.ObjectId.isValid(dealId)) {
      throw new NotFoundError('Deal not found', ErrorCodes.DEAL_NOT_FOUND);
    }

    const deal = await Deal.findById(dealId)
      .populate('listingId', 'title imageUrls')
      .populate('sellerId', 'displayName isNidVerified')
      .populate('buyerId', 'displayName isNidVerified');

    if (!deal) {
      throw new NotFoundError('Deal not found', ErrorCodes.DEAL_NOT_FOUND);
    }

    const seller = deal.sellerId as any;
    const buyer = deal.buyerId as any;

    if (seller._id.toString() !== userId && buyer._id.toString() !== userId) {
      throw new ForbiddenError(
        'You are not a participant in this deal',
        ErrorCodes.UNAUTHORIZED_DEAL_ACTION
      );
    }

    const listingDoc = deal.listingId as any;
    const completedDate = deal.completedAt || new Date();
    const reviewWindowExpiresAt = new Date(
      new Date(completedDate).getTime() + 48 * 60 * 60 * 1000
    ).toISOString();

    sendSuccess(res, {
      id: deal._id.toString(),
      dealId: deal._id.toString(),
      dealReceiptNumber: `BK-${deal._id.toString().slice(-6).toUpperCase()}`,
      listingId: listingDoc._id ? listingDoc._id.toString() : deal.listingId.toString(),
      listingTitle: listingDoc.title || 'Untitled Listing',
      listingImageUrl: listingDoc.imageUrls?.[0] || '',
      sellerId: seller._id ? seller._id.toString() : deal.sellerId.toString(),
      sellerName: seller.displayName || 'Seller',
      sellerVerified: !!seller.isNidVerified,
      buyerId: buyer._id ? buyer._id.toString() : deal.buyerId.toString(),
      buyerName: buyer.displayName || 'Buyer',
      buyerVerified: !!buyer.isNidVerified,
      finalPrice: deal.finalPrice,
      status: 'completed',
      disputeStatus: deal.disputeStatus || 'none',
      sellerReviewed: !!deal.isReviewedBySeller,
      buyerReviewed: !!deal.isReviewedByBuyer,
      reviewWindowExpiresAt,
      completedAt: completedDate.toISOString ? completedDate.toISOString() : new Date(completedDate).toISOString(),
      listing: {
        listingId: listingDoc._id ? listingDoc._id.toString() : deal.listingId.toString(),
        title: listingDoc.title,
        imageUrls: listingDoc.imageUrls
      },
      seller: {
        userId: seller._id ? seller._id.toString() : deal.sellerId.toString(),
        displayName: seller.displayName,
        isNidVerified: seller.isNidVerified
      },
      buyer: {
        userId: buyer._id ? buyer._id.toString() : deal.buyerId.toString(),
        displayName: buyer.displayName,
        isNidVerified: buyer.isNidVerified
      },
      isReviewedBySeller: deal.isReviewedBySeller,
      isReviewedByBuyer: deal.isReviewedByBuyer
    });
  } catch (error) {
    next(error);
  }
};
