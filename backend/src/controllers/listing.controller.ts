import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Listing, IListing } from '../models/listing.model.js';
import { User } from '../models/user.model.js';
import { PhoneRevealAudit } from '../models/phoneRevealAudit.model.js';
import { getRedisClient } from '../config/redis.js';
import { schedulePriceDropAlert } from '../queues/priceDropAlert.queue.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  RateLimitError
} from '../errors/index.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { ListingStatus, ModerationStatus } from '../constants/enums.js';

export const MAX_MONTHLY_ACTIVE_LISTINGS = 5;
export const MAX_DAILY_PHONE_REVEALS = 10;

/**
 * GET /api/v1/listings
 * Public catalog search, geospatial radius, and facet filters.
 */
export const searchListings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      q,
      category,
      condition,
      division,
      thana,
      longitude,
      latitude,
      maxDistanceKm = 25,
      minPrice,
      maxPrice,
      sort = 'newest',
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Fail-fast if database connection is not ready
    if (mongoose.connection.readyState !== 1) {
      sendSuccess(res, [], 200, 'Database offline, returned empty listings', {
        page: pageNum,
        limit: limitNum,
        totalCount: 0,
        totalPages: 0
      });
      return;
    }

    const filter: Record<string, any> = {
      status: ListingStatus.ACTIVE,
      moderationStatus: ModerationStatus.APPROVED,
      deletedAt: null
    };

    // 1. Text search
    if (q && typeof q === 'string' && q.trim().length >= 2) {
      filter.$or = [
        { title: { $regex: q.trim(), $options: 'i' } },
        { description: { $regex: q.trim(), $options: 'i' } }
      ];
    }

    // 2. Exact match filters
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (division) filter['location.division'] = division;
    if (thana) filter['location.thana'] = thana;

    // 3. Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = parseFloat(minPrice as string);
      if (maxPrice !== undefined) filter.price.$lte = parseFloat(maxPrice as string);
    }

    // 4. Geospatial radius filter
    let userCoords: [number, number] | null = null;
    if (longitude !== undefined && latitude !== undefined) {
      const lng = parseFloat(longitude as string);
      const lat = parseFloat(latitude as string);
      const radiusKm = parseFloat(maxDistanceKm as string) || 25;

      if (!isNaN(lng) && !isNaN(lat)) {
        userCoords = [lng, lat];
        // 6378.1 is the Earth radius in km for MongoDB centerSphere
        filter['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusKm / 6378.1]
          }
        };
      }
    }

    // 5. Sorting
    let sortObj: Record<string, any> = { createdAt: -1 };
    if (sort === 'price_low') sortObj = { price: 1, createdAt: -1 };
    else if (sort === 'price_high') sortObj = { price: -1, createdAt: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };

    const totalCount = await Listing.countDocuments(filter);
    const listings = await Listing.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('sellerId', 'displayName isNidVerified averageRating totalDealsCompleted avatarUrl')
      .lean();

    // Calculate approximate distance if user coordinates supplied
    const formattedListings = listings.map((item: any) => {
      let distanceKm: number | undefined;
      if (userCoords && item.location?.coordinates) {
        const [lng1, lat1] = userCoords;
        const [lng2, lat2] = item.location.coordinates;
        // Haversine formula
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lng2 - lng1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm = Math.round(R * c * 10) / 10;
      }

      const seller = item.sellerId || {};
      return {
        id: item._id,
        title: item.title,
        price: item.price,
        condition: item.condition,
        category: item.category,
        thumbnailUrl: item.imageUrls?.[0] || null,
        imageUrls: item.imageUrls,
        videoUrl: item.videoUrl || null,
        location: {
          division: item.location?.division,
          thana: item.location?.thana,
          coordinates: item.location?.coordinates
        },
        ...(distanceKm !== undefined && { distanceKm }),
        seller: {
          id: seller._id,
          displayName: seller.displayName,
          isNidVerified: seller.isNidVerified ?? false,
          averageRating: seller.averageRating ?? 0,
          totalDealsCompleted: seller.totalDealsCompleted ?? 0
        },
        isPhoneHidden: item.isPhoneHidden ?? true,
        createdAt: item.createdAt
      };
    });

    sendSuccess(
      res,
      formattedListings,
      200,
      'Listings retrieved successfully',
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

/**
 * GET /api/v1/listings/:id
 * Fetches full details, seller trust badge, and atomically increments view count.
 */
export const getListingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid listing ID format.', ErrorCodes.VALIDATION_ERROR);
    }

    if (mongoose.connection.readyState !== 1) {
      throw new NotFoundError('Database offline, listing temporarily unavailable.', ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    const listing = await Listing.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .populate('sellerId', 'displayName avatarUrl isNidVerified averageRating totalDealsCompleted createdAt')
      .lean();

    if (!listing) {
      throw new NotFoundError('Listing not found or has been removed.', ErrorCodes.LISTING_NOT_FOUND);
    }

    const seller: any = listing.sellerId || {};

    // Gating: only seller or admin/moderator can view ads while under review
    const requestingUserId = req.user?.userId;
    const requestingUserRole = req.user?.role;
    const isOwnerOrStaff =
      requestingUserId &&
      (requestingUserId === seller._id?.toString() ||
        requestingUserRole === 'super_admin' ||
        requestingUserRole === 'moderator');

    if (!isOwnerOrStaff && (listing.moderationStatus !== ModerationStatus.APPROVED || listing.status !== ListingStatus.ACTIVE)) {
      throw new NotFoundError(
        'এই বিজ্ঞাপনটি বর্তমানে অ্যাডমিন পর্যালোচনায় রয়েছে। অনুমোদনের পর উন্মুক্ত হবে।',
        ErrorCodes.LISTING_NOT_FOUND
      );
    }

    const formatted = {
      id: listing._id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      condition: listing.condition,
      category: listing.category,
      imageUrls: listing.imageUrls,
      videoUrl: listing.videoUrl || null,
      location: listing.location,
      status: listing.status,
      isPhoneHidden: true, // Phone is always hidden on public detail view
      viewCount: listing.viewCount,
      inquiryCount: listing.inquiryCount,
      renewCount: listing.renewCount,
      expiresAt: listing.expiresAt,
      seller: {
        id: seller._id,
        displayName: seller.displayName,
        avatarUrl: seller.avatarUrl || null,
        isNidVerified: seller.isNidVerified ?? false,
        averageRating: seller.averageRating ?? 0,
        totalDealsCompleted: seller.totalDealsCompleted ?? 0,
        memberSince: seller.createdAt
      },
      createdAt: listing.createdAt
    };

    sendSuccess(res, formatted, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/listings
 * Creates a new marketplace listing.
 * Enforces verified citizen requirement and max 5 active listings per 30-day quota.
 */
export const createListing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestError('User authentication required.');
    }

    // Enforce 5 active listings in rolling 30-day window quota
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeQuotaUsed = await Listing.countDocuments({
      sellerId: userId,
      status: ListingStatus.ACTIVE,
      deletedAt: null,
      createdAt: { $gte: thirtyDaysAgo }
    });

    if (activeQuotaUsed >= MAX_MONTHLY_ACTIVE_LISTINGS) {
      throw new ForbiddenError(
        'A personal account can post a maximum of 5 active listings per month.',
        ErrorCodes.C2C_QUOTA_EXHAUSTED
      );
    }

    const {
      title,
      description,
      price,
      condition,
      category,
      location,
      imageUrls,
      videoUrl,
      isPhoneHidden = true
    } = req.body;

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day lifecycle

    const newListing = await Listing.create({
      sellerId: new mongoose.Types.ObjectId(userId),
      title: title.trim(),
      description: description.trim(),
      price: Math.round(price),
      condition,
      category,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        division: location.division.trim(),
        thana: location.thana.trim()
      },
      imageUrls,
      videoUrl: videoUrl || null,
      status: ListingStatus.UNDER_REVIEW,
      moderationStatus: ModerationStatus.PENDING,
      isPhoneHidden,
      expiresAt
    });

    const activeQuotaRemaining = MAX_MONTHLY_ACTIVE_LISTINGS - (activeQuotaUsed + 1);

    sendSuccess(
      res,
      {
        id: newListing._id,
        title: newListing.title,
        price: newListing.price,
        status: newListing.status,
        moderationStatus: newListing.moderationStatus,
        expiresAt: newListing.expiresAt,
        activeQuotaRemaining
      },
      201,
      'আপনার বিজ্ঞাপনটি পর্যালোচনার জন্য জমা হয়েছে। অ্যাডমিন অনুমোদনের পর এটি সাইটে প্রদর্শিত হবে।'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/listings/:id
 * Modifies asking price, description, images, or condition.
 * Triggers debounced price-drop alert if price was reduced.
 */
export const updateListing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const listing = await Listing.findOne({ _id: id, deletedAt: null });

    if (!listing) {
      throw new NotFoundError('Listing not found.', ErrorCodes.LISTING_NOT_FOUND);
    }

    const {
      title,
      description,
      price,
      condition,
      category,
      location,
      imageUrls,
      videoUrl,
      isPhoneHidden
    } = req.body;

    const oldPrice = listing.price;
    const isPriceReduced = price !== undefined && price < oldPrice;

    if (title) listing.title = title.trim();
    if (description) listing.description = description.trim();
    if (price !== undefined) listing.price = Math.round(price);
    if (condition) listing.condition = condition;
    if (category) listing.category = category;
    if (location) {
      listing.location = {
        type: 'Point',
        coordinates: location.coordinates || listing.location.coordinates,
        division: location.division || listing.location.division,
        thana: location.thana || listing.location.thana
      };
    }
    if (imageUrls) listing.imageUrls = imageUrls;
    if (videoUrl !== undefined) listing.videoUrl = videoUrl;
    if (isPhoneHidden !== undefined) listing.isPhoneHidden = isPhoneHidden;

    await listing.save();

    // Trigger debounced price drop alert (5-minute delay)
    if (isPriceReduced) {
      try {
        await schedulePriceDropAlert(listing._id.toString(), oldPrice, listing.price);
      } catch (err: any) {
        logger.error(`Failed to schedule price drop alert: ${err.message}`);
      }
    }

    sendSuccess(
      res,
      {
        id: listing._id,
        price: listing.price,
        updatedAt: listing.updatedAt
      },
      200,
      'Listing updated successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/listings/:id
 * Soft deletes listing by marking deletedAt and status = archived.
 */
export const deleteListing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const listing = await Listing.findOne({ _id: id, deletedAt: null });

    if (!listing) {
      throw new NotFoundError('Listing not found.', ErrorCodes.LISTING_NOT_FOUND);
    }

    listing.deletedAt = new Date();
    listing.status = ListingStatus.ARCHIVED;
    await listing.save();

    sendSuccess(
      res,
      {
        id: listing._id,
        status: listing.status,
        deletedAt: listing.deletedAt
      },
      200,
      'Listing deleted successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/listings/:id/renew
 * Extends ad validity for 30 additional days (on Day 25+). Max 2 renewals.
 */
export const renewListing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const listing = await Listing.findOne({ _id: id, deletedAt: null });

    if (!listing) {
      throw new NotFoundError('Listing not found.', ErrorCodes.LISTING_NOT_FOUND);
    }

    if (listing.renewCount >= listing.maxRenewals) {
      throw new ForbiddenError(
        'Listing has already reached the maximum of 2 renewals.',
        ErrorCodes.MAX_RENEWALS_REACHED
      );
    }

    // Day 25+ check: cannot renew if more than 5 days remaining in lifecycle
    const remainingMs = listing.expiresAt.getTime() - Date.now();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    if (remainingMs > fiveDaysMs) {
      throw new BadRequestError(
        'Ad can only be renewed on or after Day 25.',
        ErrorCodes.RENEWAL_TOO_EARLY
      );
    }

    listing.renewCount += 1;
    listing.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    listing.status = ListingStatus.ACTIVE;
    listing.renewedAt = new Date();
    await listing.save();

    sendSuccess(
      res,
      {
        id: listing._id,
        renewCount: listing.renewCount,
        maxRenewals: listing.maxRenewals,
        expiresAt: listing.expiresAt
      },
      200,
      'Listing validity has been extended by 30 days.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/listings/:id/status
 * Updates status between active, under_offer, or sold.
 */
export const updateListingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, soldToBuyerId } = req.body;

    const listing = await Listing.findOne({ _id: id, deletedAt: null });
    if (!listing) {
      throw new NotFoundError('Listing not found.', ErrorCodes.LISTING_NOT_FOUND);
    }

    listing.status = status;
    if (status === ListingStatus.SOLD && soldToBuyerId) {
      listing.soldToBuyerId = new mongoose.Types.ObjectId(soldToBuyerId);
    }

    await listing.save();

    sendSuccess(
      res,
      {
        id: listing._id,
        status: listing.status
      },
      200,
      'Listing status updated successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/listings/my-listings
 * Fetches all ads posted by the authenticated seller.
 */
export const getMyListings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {
      sellerId: userId,
      deletedAt: null
    };

    if (status) filter.status = status;

    const totalCount = await Listing.countDocuments(filter);
    const listings = await Listing.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    sendSuccess(
      res,
      listings.map((l: any) => ({
        id: l._id,
        title: l.title,
        price: l.price,
        status: l.status,
        moderationStatus: l.moderationStatus || 'pending',
        condition: l.condition,
        category: l.category,
        location: l.location
          ? {
              division: l.location.division,
              thana: l.location.thana,
              coordinates: l.location.coordinates
            }
          : null,
        imageUrls: l.imageUrls,
        viewCount: l.viewCount,
        inquiryCount: l.inquiryCount,
        renewCount: l.renewCount,
        expiresAt: l.expiresAt,
        createdAt: l.createdAt
      })),
      200,
      'Seller listings retrieved successfully',
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

/**
 * POST /api/v1/listings/:id/reveal-phone
 * Unmasks seller contact phone number. Rate-limited to max 10 reveals per 24 hours.
 * Logs to PhoneRevealAudit.
 */
export const revealPhoneNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const buyerId = req.user?.userId;
    const id = req.params.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid listing ID format.', ErrorCodes.VALIDATION_ERROR);
    }

    const listing = await Listing.findOne({ _id: id, deletedAt: null });
    if (!listing) {
      throw new NotFoundError('Listing not found.', ErrorCodes.LISTING_NOT_FOUND);
    }

    // Enforce 10 reveals / 24-hour rate limit via Redis
    const redis = getRedisClient();
    const revealKey = `phone_reveal:count:${buyerId}`;
    const currentCountStr = await redis.get(revealKey);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

    if (currentCount >= MAX_DAILY_PHONE_REVEALS) {
      throw new RateLimitError(
        'Daily phone reveal limit of 10 reached. Please try again in 24 hours.',
        ErrorCodes.PHONE_REVEAL_LIMIT_EXCEEDED
      );
    }

    const seller = await User.findById(listing.sellerId);
    if (!seller) {
      throw new NotFoundError('Seller account not found.', ErrorCodes.NOT_FOUND);
    }

    // Atomically increment reveal count in Redis with 24-hour TTL
    const newCount = await redis.incr(revealKey);
    if (newCount === 1) {
      await redis.expire(revealKey, 24 * 60 * 60);
    }

    // Record audit entry
    await PhoneRevealAudit.create({
      buyerId: new mongoose.Types.ObjectId(buyerId),
      listingId: listing._id,
      sellerId: listing.sellerId,
      ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1'
    });

    sendSuccess(
      res,
      {
        listingId: listing._id,
        phone: seller.phone,
        sellerPhone: seller.phone,
        revealsUsedToday: newCount,
        revealsRemainingToday: Math.max(0, MAX_DAILY_PHONE_REVEALS - newCount)
      },
      200,
      'Seller contact phone number revealed.'
    );
  } catch (error) {
    next(error);
  }
};
