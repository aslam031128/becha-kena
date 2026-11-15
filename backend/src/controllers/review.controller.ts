import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Deal, Review, User } from '../models/index.js';
import { ReviewTag } from '../constants/enums.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { ForbiddenError, NotFoundError, ConflictError } from '../errors/HttpErrors.js';
import { BadRequestError } from '../errors/ValidationError.js';
import { sendSuccess } from '../utils/response.js';

const REVIEW_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

// ---------------------------------------------------------------------------
// POST /api/v1/deals/:dealId/reviews
// Submits a bilateral review after deal completion (48-hour window).
// ---------------------------------------------------------------------------
export const submitReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const dealId = (req.params.dealId || req.body.dealId) as string;
    const { rating, tags = [], comment } = req.body;

    if (!dealId || !mongoose.Types.ObjectId.isValid(dealId)) {
      throw new NotFoundError('Deal not found', ErrorCodes.DEAL_NOT_FOUND);
    }

    // Validate rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestError('Rating must be an integer between 1 and 5', ErrorCodes.VALIDATION_ERROR);
    }

    const deal = await Deal.findById(dealId);
    if (!deal) {
      throw new NotFoundError('Deal not found', ErrorCodes.DEAL_NOT_FOUND);
    }

    const sellerIdStr = deal.sellerId.toString();
    const buyerIdStr = deal.buyerId.toString();

    // Determine reviewer role
    let isSeller: boolean;
    let revieweeId: mongoose.Types.ObjectId;

    if (userId === sellerIdStr) {
      isSeller = true;
      revieweeId = deal.buyerId;
    } else if (userId === buyerIdStr) {
      isSeller = false;
      revieweeId = deal.sellerId;
    } else {
      throw new ForbiddenError(
        'You are not a participant in this deal',
        ErrorCodes.UNAUTHORIZED_DEAL_ACTION
      );
    }

    // Check if already reviewed
    const alreadyReviewed = isSeller ? deal.isReviewedBySeller : deal.isReviewedByBuyer;
    if (alreadyReviewed) {
      throw new ConflictError(
        'You have already submitted a review for this deal',
        ErrorCodes.ALREADY_REVIEWED
      );
    }

    // Check 48-hour review window
    const ageMs = Date.now() - deal.completedAt.getTime();
    if (ageMs > REVIEW_WINDOW_MS) {
      throw new ForbiddenError(
        'The 48-hour review window for this deal has expired',
        ErrorCodes.REVIEW_WINDOW_EXPIRED
      );
    }

    // Create the review document
    const review = await Review.create({
      dealId: deal._id,
      listingId: deal.listingId,
      reviewerId: new mongoose.Types.ObjectId(userId),
      revieweeId,
      rating,
      tags: Array.isArray(tags) ? tags : [],
      comment: comment ?? null
    });

    // Mark deal as reviewed by the appropriate party
    const updateFlag = isSeller
      ? { $set: { isReviewedBySeller: true } }
      : { $set: { isReviewedByBuyer: true } };
    await Deal.findByIdAndUpdate(deal._id, updateFlag);

    // Update reviewee's average rating using weighted rolling average
    const reviewee = await User.findById(revieweeId).select('averageRating totalDealsCompleted');
    if (reviewee) {
      const total = reviewee.totalDealsCompleted || 1;
      const currentAvg = reviewee.averageRating || 0;
      const newAvg = ((currentAvg * (total - 1)) + rating) / total;
      await User.findByIdAndUpdate(revieweeId, {
        $set: { averageRating: Math.min(5, Math.max(0, parseFloat(newAvg.toFixed(2)))) }
      });
    }

    sendSuccess(
      res,
      {
        reviewId: review._id.toString(),
        dealId: review.dealId.toString(),
        rating: review.rating,
        tags: review.tags,
        createdAt: review.createdAt
      },
      201,
      'Review submitted successfully'
    );
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/users/:userId/reviews
// Public — lists reviews left for a user with pagination and rating meta.
// ---------------------------------------------------------------------------
export const getUserReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const userIdStr = userId as string;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
      throw new NotFoundError('User not found', ErrorCodes.NOT_FOUND);
    }

    const revieweeObjectId = new mongoose.Types.ObjectId(userIdStr);

    const [reviews, total, userDoc] = await Promise.all([
      Review.find({ revieweeId: revieweeObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reviewerId', 'displayName isNidVerified')
        .populate('listingId', 'title'),
      Review.countDocuments({ revieweeId: revieweeObjectId }),
      User.findById(revieweeObjectId).select('averageRating totalDealsCompleted')
    ]);

    const formatted = reviews.map((r) => {
      const reviewer = r.reviewerId as any;
      const listing = r.listingId as any;
      return {
        reviewId: r._id.toString(),
        dealId: r.dealId?.toString() ?? '',
        reviewer: reviewer
          ? {
              userId: reviewer._id?.toString() ?? '',
              displayName: reviewer.displayName ?? '',
              isNidVerified: !!reviewer.isNidVerified
            }
          : null,
        listing: listing
          ? {
              listingId: listing._id?.toString() ?? '',
              title: listing.title ?? null
            }
          : null,
        rating: r.rating,
        tags: r.tags,
        comment: r.comment ?? null,
        createdAt: r.createdAt
      };
    });

    sendSuccess(
      res,
      formatted,
      200,
      'Reviews fetched successfully',
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        averageRating: userDoc?.averageRating ?? 0,
        totalReviews: total
      }
    );
  } catch (error) {
    next(error);
  }
};
