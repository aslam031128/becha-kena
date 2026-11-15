import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Favorite } from '../models/favorite.model.js';
import { Listing } from '../models/listing.model.js';
import { sendSuccess } from '../utils/response.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../errors/index.js';
import { ErrorCodes } from '../constants/errorCodes.js';

/**
 * POST /api/v1/favorites/:listingId
 * Adds a listing to user's saved wishlist with benchmark priceAtSave.
 * Enforces verified citizen check and prevents self-favoriting.
 */
export const addFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const listingId = req.params.listingId as string;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      throw new BadRequestError('Invalid listing ID format.', ErrorCodes.VALIDATION_ERROR);
    }

    const listing = await Listing.findOne({ _id: listingId, deletedAt: null });
    if (!listing) {
      throw new NotFoundError('Listing not found.', ErrorCodes.LISTING_NOT_FOUND);
    }

    if (listing.sellerId.toString() === userId) {
      throw new ForbiddenError(
        'You cannot add your own listing to favorites.',
        ErrorCodes.FORBIDDEN
      );
    }

    // Upsert favorite with benchmark price
    const favorite = await Favorite.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), listingId: listing._id },
      {
        $setOnInsert: {
          userId: new mongoose.Types.ObjectId(userId),
          listingId: listing._id,
          priceAtSave: listing.price
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    sendSuccess(
      res,
      {
        favoriteId: favorite._id,
        listingId: favorite.listingId,
        priceAtSave: favorite.priceAtSave
      },
      201,
      'Listing added to favorites.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/favorites/:listingId
 * Removes a listing from user's wishlist.
 */
export const removeFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const listingId = req.params.listingId as string;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      throw new BadRequestError('Invalid listing ID format.', ErrorCodes.VALIDATION_ERROR);
    }

    const result = await Favorite.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(userId),
      listingId: new mongoose.Types.ObjectId(listingId)
    });

    if (!result) {
      throw new NotFoundError('Listing was not in your favorites.', ErrorCodes.NOT_FOUND);
    }

    sendSuccess(
      res,
      {
        listingId,
        removed: true
      },
      200,
      'Listing removed from favorites.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/favorites
 * Fetches all saved favorites for authenticated citizen.
 * Computes real-time price drop difference against benchmark priceAtSave.
 */
export const getFavorites = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Favorite.countDocuments({
      userId: new mongoose.Types.ObjectId(userId)
    });

    const favorites = await Favorite.find({
      userId: new mongoose.Types.ObjectId(userId)
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('listingId')
      .lean();

    const formatted = favorites
      .filter((fav: any) => fav.listingId && fav.listingId.deletedAt === null)
      .map((fav: any) => {
        const listing = fav.listingId;
        const currentPrice = listing.price;
        const priceAtSave = fav.priceAtSave;
        const isPriceDropped = currentPrice < priceAtSave;
        const priceDropAmount = isPriceDropped ? priceAtSave - currentPrice : 0;

        return {
          favoriteId: fav._id,
          listingId: listing._id,
          title: listing.title,
          currentPrice,
          priceAtSave,
          isPriceDropped,
          priceDropAmount,
          status: listing.status,
          condition: listing.condition,
          category: listing.category,
          thumbnailUrl: listing.imageUrls?.[0] || null,
          imageUrls: listing.imageUrls,
          location: listing.location,
          savedAt: fav.createdAt
        };
      });

    sendSuccess(
      res,
      formatted,
      200,
      'Favorites retrieved successfully',
      {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    );
  } catch (error) {
    next(error);
  }
};
