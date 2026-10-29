import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../errors/HttpErrors.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { UserRole } from '../constants/enums.js';
import { Listing } from '../models/listing.model.js';
import { OBJECT_ID_REGEX } from '../constants/regex.js';

/**
 * Ensures the authenticated citizen has completed National ID verification and is not frozen.
 * Rejects unverified citizens with 403 KYC_REQUIRED, and frozen accounts with 403 ACCOUNT_FROZEN.
 */
export const requireVerifiedCitizen = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', ErrorCodes.UNAUTHORIZED);
  }

  if (!req.user.isNidVerified) {
    throw new ForbiddenError(
      'NID verification is required to perform this action',
      ErrorCodes.KYC_REQUIRED
    );
  }

  if (req.user.isFrozen) {
    throw new ForbiddenError(
      'Your account is currently frozen due to an open dispute',
      ErrorCodes.ACCOUNT_FROZEN
    );
  }

  next();
};

/**
 * Enforces Role-Based Access Control against an allowed array of roles (e.g. moderator, super_admin).
 */
export const requireRole = (roles: (UserRole | string)[] | UserRole | string) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', ErrorCodes.UNAUTHORIZED);
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      throw new ForbiddenError(
        'Insufficient permissions to access this resource',
        ErrorCodes.FORBIDDEN
      );
    }

    next();
  };
};

/**
 * Verifies that the authenticated citizen is the owner/seller of the listing referenced in :id or :listingId.
 */
export const requireListingOwner = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', ErrorCodes.UNAUTHORIZED);
    }

    const listingId = req.params.id || req.params.listingId;
    if (!listingId || typeof listingId !== 'string' || !OBJECT_ID_REGEX.test(listingId)) {
      throw new NotFoundError('Listing not found', ErrorCodes.LISTING_NOT_FOUND);
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new NotFoundError('Listing not found', ErrorCodes.LISTING_NOT_FOUND);
    }

    if (listing.sellerId.toString() !== req.user.userId) {
      throw new ForbiddenError(
        'You do not have permission to manage this listing',
        ErrorCodes.UNAUTHORIZED_LISTING_ACTION
      );
    }

    // Attach listing to request object for subsequent handlers
    (req as any).listing = listing;
    next();
  } catch (error) {
    next(error);
  }
};
