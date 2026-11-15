import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Report, Listing, Conversation, User } from '../models/index.js';
import {
  ReportEntityType,
  ReportReason,
  ReportStatus,
  ListingStatus,
  ModerationStatus
} from '../constants/enums.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { NotFoundError, ConflictError } from '../errors/HttpErrors.js';
import { BadRequestError } from '../errors/ValidationError.js';
import { sendSuccess } from '../utils/response.js';

// Auto-quarantine threshold (3 pending community reports)
const QUARANTINE_THRESHOLD = 3;

/**
 * POST /api/v1/reports
 * Flag a listing, chat message/conversation, or user profile.
 * Automatically quarantines a listing if >= 3 pending reports accumulate.
 */
export const submitReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { entityType, entityId, reason, details } = req.body;

    if (!entityId || !mongoose.Types.ObjectId.isValid(entityId as string)) {
      throw new BadRequestError('Invalid entity ID format', ErrorCodes.VALIDATION_ERROR);
    }

    if (!Object.values(ReportEntityType).includes(entityType)) {
      throw new BadRequestError('Invalid report entity type', ErrorCodes.VALIDATION_ERROR);
    }

    if (!Object.values(ReportReason).includes(reason)) {
      throw new BadRequestError('Invalid report reason', ErrorCodes.VALIDATION_ERROR);
    }

    const entityObjectId = new mongoose.Types.ObjectId(entityId as string);

    // Entity-specific validation & self-reporting prevention
    if (entityType === ReportEntityType.USER) {
      if (entityId.toString() === userId) {
        throw new BadRequestError('You cannot report yourself', ErrorCodes.CANNOT_REPORT_SELF);
      }
      const userExists = await User.findById(entityObjectId);
      if (!userExists) {
        throw new NotFoundError('User not found', ErrorCodes.NOT_FOUND);
      }
    } else if (entityType === ReportEntityType.LISTING) {
      const listing = await Listing.findById(entityObjectId);
      if (!listing) {
        throw new NotFoundError('Listing not found', ErrorCodes.LISTING_NOT_FOUND);
      }
      if (listing.sellerId.toString() === userId) {
        throw new BadRequestError('You cannot report your own listing', ErrorCodes.CANNOT_REPORT_SELF);
      }
    } else if (entityType === ReportEntityType.CHAT) {
      const conversation = await Conversation.findById(entityObjectId);
      if (!conversation) {
        throw new NotFoundError('Conversation not found', ErrorCodes.CONVERSATION_NOT_FOUND);
      }
    }

    // Check duplicate pending report by the same citizen
    const existingPendingReport = await Report.findOne({
      reporterId: new mongoose.Types.ObjectId(userId),
      entityId: entityObjectId,
      status: ReportStatus.PENDING
    });

    if (existingPendingReport) {
      throw new ConflictError(
        'You have already submitted a pending report for this item',
        ErrorCodes.ALREADY_REPORTED
      );
    }

    // Create Report document
    const report = await Report.create({
      reporterId: new mongoose.Types.ObjectId(userId),
      entityType,
      entityId: entityObjectId,
      reason,
      details,
      status: ReportStatus.PENDING
    });

    // Auto-quarantine check for listings
    if (entityType === ReportEntityType.LISTING) {
      const pendingCount = await Report.countDocuments({
        entityType: ReportEntityType.LISTING,
        entityId: entityObjectId,
        status: ReportStatus.PENDING
      });

      if (pendingCount >= QUARANTINE_THRESHOLD) {
        await Listing.findByIdAndUpdate(entityObjectId, {
          $set: {
            status: ListingStatus.UNDER_REVIEW,
            moderationStatus: ModerationStatus.FLAGGED
          }
        });
      }
    }

    sendSuccess(
      res,
      {
        reportId: report._id.toString(),
        status: report.status,
        createdAt: report.createdAt
      },
      201,
      'Report received. Our Trust & Safety team will investigate promptly.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/me
 * Retrieves all reports submitted by the currently authenticated citizen.
 */
export const getMyReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const reports = await Report.find({
      reporterId: new mongoose.Types.ObjectId(userId)
    }).sort({ createdAt: -1 });

    const formatted = reports.map((r) => ({
      reportId: r._id.toString(),
      entityType: r.entityType,
      entityId: r.entityId.toString(),
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt ?? null
    }));

    sendSuccess(res, formatted, 200, 'Reports retrieved successfully');
  } catch (error) {
    next(error);
  }
};

