import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Deal, Dispute, User } from '../models/index.js';
import { DisputeStatus, UserRole } from '../constants/enums.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { ForbiddenError, NotFoundError, ConflictError } from '../errors/HttpErrors.js';
import { BadRequestError } from '../errors/ValidationError.js';
import { sendSuccess } from '../utils/response.js';

/**
 * POST /api/v1/deals/:dealId/disputes
 * Allows the buyer of a completed deal to file a formal dispute attaching
 * an official Bangladesh Police General Diary (GD) number and stamped document.
 * Automatically freezes the accused seller's account.
 */
export const fileDispute = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const dealId = req.params.dealId as string;
    const { gdNumber, thanaName, gdFilingDate, gdDocumentUrl } = req.body;

    if (!dealId || !mongoose.Types.ObjectId.isValid(dealId)) {
      throw new NotFoundError('Deal not found', ErrorCodes.DEAL_NOT_FOUND);
    }

    const deal = await Deal.findById(dealId);
    if (!deal) {
      throw new NotFoundError('Deal not found', ErrorCodes.DEAL_NOT_FOUND);
    }

    // Only the buyer can file a dispute
    if (deal.buyerId.toString() !== userId) {
      throw new ForbiddenError(
        'Only the buyer in this deal can file a legal dispute',
        ErrorCodes.UNAUTHORIZED_DISPUTE_ACTION
      );
    }

    // Check if a dispute has already been filed for this deal
    if (deal.disputeStatus !== DisputeStatus.NONE) {
      throw new ConflictError(
        'A dispute has already been filed for this deal',
        ErrorCodes.DISPUTE_ALREADY_EXISTS
      );
    }

    const existingDispute = await Dispute.findOne({ dealId: deal._id });
    if (existingDispute) {
      throw new ConflictError(
        'A dispute has already been filed for this deal',
        ErrorCodes.DISPUTE_ALREADY_EXISTS
      );
    }

    // Validate GD date
    const parsedDate = new Date(gdFilingDate);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestError('Invalid GD filing date format', ErrorCodes.VALIDATION_ERROR);
    }
    if (parsedDate.getTime() > Date.now()) {
      throw new BadRequestError('GD filing date cannot be in the future', ErrorCodes.VALIDATION_ERROR);
    }

    // Create Dispute record
    const dispute = await Dispute.create({
      dealId: deal._id,
      buyerId: deal.buyerId,
      sellerId: deal.sellerId,
      gdNumber: gdNumber.trim(),
      thanaName: thanaName.trim(),
      gdFilingDate: parsedDate,
      gdDocumentUrl: gdDocumentUrl.trim(),
      status: 'pending'
    });

    // Update Deal with dispute status and reference
    await Deal.findByIdAndUpdate(deal._id, {
      $set: {
        disputeStatus: DisputeStatus.FILED,
        disputeId: dispute._id
      }
    });

    // Automatically freeze the accused seller's account
    await User.findByIdAndUpdate(deal.sellerId, {
      $set: { isFrozen: true }
    });

    sendSuccess(
      res,
      {
        disputeId: dispute._id.toString(),
        dealId: deal._id.toString(),
        status: dispute.status,
        sellerFrozen: true,
        createdAt: dispute.createdAt
      },
      201,
      'Police GD legal dispute recorded. Accused seller account has been temporarily frozen.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/deals/:dealId/dispute (also /disputes)
 * Retrieves active dispute details for a deal.
 * Only accessible by the deal buyer, seller, or moderators/admins.
 */
export const getDispute = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const dealId = req.params.dealId as string;

    if (!dealId || !mongoose.Types.ObjectId.isValid(dealId)) {
      throw new NotFoundError('Deal not found', ErrorCodes.DEAL_NOT_FOUND);
    }

    const deal = await Deal.findById(dealId);
    if (!deal) {
      throw new NotFoundError('Deal not found', ErrorCodes.DEAL_NOT_FOUND);
    }

    const isBuyer = deal.buyerId.toString() === userId;
    const isSeller = deal.sellerId.toString() === userId;
    const isPrivileged = userRole === UserRole.MODERATOR || userRole === UserRole.SUPER_ADMIN;

    if (!isBuyer && !isSeller && !isPrivileged) {
      throw new ForbiddenError(
        'You do not have permission to view this dispute',
        ErrorCodes.UNAUTHORIZED_DISPUTE_ACTION
      );
    }

    const dispute = await Dispute.findOne({ dealId: deal._id });
    if (!dispute) {
      throw new NotFoundError('No dispute found for this deal', ErrorCodes.DISPUTE_NOT_FOUND);
    }

    sendSuccess(
      res,
      {
        disputeId: dispute._id.toString(),
        dealId: dispute.dealId.toString(),
        gdNumber: dispute.gdNumber,
        thanaName: dispute.thanaName,
        gdFilingDate: dispute.gdFilingDate,
        gdDocumentUrl: dispute.gdDocumentUrl,
        status: dispute.status,
        resolutionAction: dispute.resolutionAction ?? null,
        createdAt: dispute.createdAt
      },
      200,
      'Dispute details retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

