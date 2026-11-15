import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  User,
  Listing,
  Report,
  Dispute,
  Deal,
  NidBlacklist,
  PhoneRevealAudit
} from '../models/index.js';
import {
  KycStatus,
  UserRole,
  ListingStatus,
  ModerationStatus,
  ReportStatus,
  DisputeStatus,
  DisputeResolution
} from '../constants/enums.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../errors/HttpErrors.js';
import { BadRequestError } from '../errors/ValidationError.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { getRedisClient } from '../config/redis.js';

// ---------------------------------------------------------------------------
// 13.1 — Manual KYC Review Queue (GET /api/v1/admin/kyc/queue)
// ---------------------------------------------------------------------------
export const getKycQueue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    const query = {
      kycStatus: { $in: [KycStatus.MANUAL_REVIEW, KycStatus.PENDING] }
    };

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ updatedAt: 1 }) // Oldest submissions first for SLA fairness
        .skip(skip)
        .limit(limit)
        .select('phone displayName kycAttempts kycDocuments updatedAt createdAt'),
      User.countDocuments(query)
    ]);

    const formatted = users.map((u) => {
      const submittedAt = u.kycDocuments?.submittedAt || u.updatedAt || u.createdAt;
      const slaAgingHours =
        Math.round(((Date.now() - new Date(submittedAt).getTime()) / (1000 * 3600)) * 100) / 100;

      let slaStatus = 'healthy';
      if (slaAgingHours >= 4) {
        slaStatus = 'breached';
      } else if (slaAgingHours >= 2) {
        slaStatus = 'warning';
      }

      return {
        userId: u._id.toString(),
        phone: u.phone,
        displayName: u.displayName,
        kycAttempts: u.kycAttempts,
        submittedAt,
        frontImageKey: u.kycDocuments?.frontImageKey || null,
        backImageKey: u.kycDocuments?.backImageKey || null,
        liveSelfieKey: u.kycDocuments?.liveSelfieKey || null,
        nidNumber: u.kycDocuments?.nidNumber || null,
        dob: u.kycDocuments?.dob || null,
        slaAgingHours,
        slaStatus
      };
    });

    sendSuccess(res, formatted, 200, 'KYC manual review queue retrieved', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// 13.2 — Approve Manual KYC Review (PATCH /api/v1/admin/kyc/:userId/approve)
// ---------------------------------------------------------------------------
export const approveKyc = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundError('User not found', ErrorCodes.NOT_FOUND);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.NOT_FOUND);
    }

    user.isNidVerified = true;
    user.kycStatus = KycStatus.VERIFIED;
    await user.save();

    sendSuccess(
      res,
      {
        userId: user._id.toString(),
        isNidVerified: user.isNidVerified,
        kycStatus: user.kycStatus
      },
      200,
      'Citizen identity approved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// 13.3 — Reject Manual KYC Review (PATCH /api/v1/admin/kyc/:userId/reject)
// ---------------------------------------------------------------------------
export const rejectKyc = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const { reason } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundError('User not found', ErrorCodes.NOT_FOUND);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.NOT_FOUND);
    }

    user.isNidVerified = false;
    user.kycStatus = KycStatus.RETAKE_REQUIRED;
    if (user.kycDocuments) {
      user.kycDocuments.rejectionReason = reason ?? 'Photos are blurry or cropped. Please retake.';
    }
    await user.save();

    sendSuccess(
      res,
      {
        userId: user._id.toString(),
        kycStatus: user.kycStatus,
        reason: reason ?? 'Photos are blurry or cropped. Please retake.'
      },
      200,
      'KYC application rejected.'
    );
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// 13.4 — Community Reports Queue (GET /api/v1/admin/reports)
// ---------------------------------------------------------------------------
export const getAdminReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = req.query.status as string;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (status && Object.values(ReportStatus).includes(status as ReportStatus)) {
      query.status = status;
    }

    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporterId', 'displayName phone'),
      Report.countDocuments(query)
    ]);

    const formatted = reports.map((r) => ({
      id: r._id.toString(),
      reporterId: r.reporterId ? (r.reporterId as any)._id?.toString() : null,
      reporterName: r.reporterId ? (r.reporterId as any).displayName : null,
      entityType: r.entityType,
      entityId: r.entityId.toString(),
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt ?? null
    }));

    sendSuccess(res, formatted, 200, 'Reports queue retrieved', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// 13.5 — Triage Report Action (PATCH /api/v1/admin/reports/:reportId/action)
// ---------------------------------------------------------------------------
export const actionReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reportId = req.params.reportId as string;
    const { action } = req.body;

    if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
      throw new NotFoundError('Report not found', ErrorCodes.REPORT_NOT_FOUND);
    }

    const report = await Report.findById(reportId);
    if (!report) {
      throw new NotFoundError('Report not found', ErrorCodes.REPORT_NOT_FOUND);
    }

    const moderatorId = new mongoose.Types.ObjectId(req.user!.userId);

    if (action === 'dismiss') {
      report.status = ReportStatus.DISMISSED;
    } else if (action === 'quarantine') {
      report.status = ReportStatus.ACTIONED;
      if (report.entityType === 'listing') {
        await Listing.findByIdAndUpdate(report.entityId, {
          $set: {
            status: ListingStatus.UNDER_REVIEW,
            moderationStatus: ModerationStatus.FLAGGED
          }
        });
      }
    } else if (action === 'warn') {
      report.status = ReportStatus.ACTIONED;
    } else if (action === 'escalate') {
      report.status = ReportStatus.INVESTIGATING;
    } else {
      throw new BadRequestError(
        'Invalid action. Allowed: dismiss, quarantine, warn, escalate',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    report.reviewedBy = moderatorId;
    report.resolvedAt = new Date();
    await report.save();

    sendSuccess(
      res,
      {
        reportId: report._id.toString(),
        status: report.status,
        actionTaken: action,
        resolvedAt: report.resolvedAt
      },
      200,
      `Report successfully ${action === 'dismiss' ? 'dismissed' : 'actioned'}.`
    );
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// 13.6 — Active Disputes Queue (GET /api/v1/admin/disputes)
// ---------------------------------------------------------------------------
export const getAdminDisputes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = req.query.status as string;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (status) {
      query.status = status;
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('buyerId', 'displayName phone')
        .populate('sellerId', 'displayName phone')
        .populate('dealId', 'finalPrice completedAt'),
      Dispute.countDocuments(query)
    ]);

    const formatted = disputes.map((d) => ({
      disputeId: d._id.toString(),
      dealId: d.dealId ? ((d.dealId as any)._id?.toString() || (d.dealId as any).toString()) : null,
      buyer: d.buyerId
        ? {
            userId: (d.buyerId as any)._id?.toString(),
            displayName: (d.buyerId as any).displayName,
            phone: (d.buyerId as any).phone
          }
        : null,
      seller: d.sellerId
        ? {
            userId: (d.sellerId as any)._id?.toString(),
            displayName: (d.sellerId as any).displayName,
            phone: (d.sellerId as any).phone
          }
        : null,
      gdNumber: d.gdNumber,
      thanaName: d.thanaName,
      gdFilingDate: d.gdFilingDate,
      gdDocumentUrl: d.gdDocumentUrl,
      status: d.status,
      resolutionAction: d.resolutionAction ?? null,
      createdAt: d.createdAt
    }));

    sendSuccess(res, formatted, 200, 'Disputes queue retrieved', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// 13.7 — Resolve Dispute (PATCH /api/v1/admin/disputes/:disputeId/resolve)
// Super Admin only
// ---------------------------------------------------------------------------
export const resolveDispute = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const disputeId = req.params.disputeId as string;
    const { resolutionAction } = req.body;

    if (!disputeId || !mongoose.Types.ObjectId.isValid(disputeId)) {
      throw new NotFoundError('Dispute not found', ErrorCodes.DISPUTE_NOT_FOUND);
    }

    if (!Object.values(DisputeResolution).includes(resolutionAction)) {
      throw new BadRequestError('Invalid dispute resolution action', ErrorCodes.VALIDATION_ERROR);
    }

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute not found', ErrorCodes.DISPUTE_NOT_FOUND);
    }

    const superAdminId = new mongoose.Types.ObjectId(req.user!.userId);

    if (resolutionAction === DisputeResolution.SELLER_BANNED) {
      // 1. Permanently ban seller
      const seller = await User.findById(dispute.sellerId);
      if (seller) {
        seller.isBanned = true;
        seller.bannedAt = new Date();
        seller.banReason = 'Stolen goods dispute confirmed by Police GD';
        seller.banProposedBy = superAdminId;
        await seller.save();

        // 2. Blacklist seller
        const nidHash = seller.nidHash || `unverified_${seller._id}`;
        await NidBlacklist.findOneAndUpdate(
          { phone: seller.phone },
          {
            $setOnInsert: {
              nidHash,
              phone: seller.phone,
              deviceUUID: seller.deviceUUIDs?.[0] || null,
              reason: 'Police GD confirmed stolen item dispute',
              bannedBy: superAdminId
            }
          },
          { upsert: true }
        );

        // 3. Archive all seller listings
        await Listing.updateMany(
          {
            sellerId: seller._id,
            status: { $in: [ListingStatus.ACTIVE, ListingStatus.UNDER_OFFER, ListingStatus.UNDER_REVIEW] }
          },
          { $set: { status: ListingStatus.ARCHIVED } }
        );
      }

      dispute.status = 'verified';
      dispute.resolutionAction = DisputeResolution.SELLER_BANNED;
      await Deal.findByIdAndUpdate(dispute.dealId, {
        $set: { disputeStatus: DisputeStatus.RESOLVED }
      });
    } else if (resolutionAction === DisputeResolution.CLAIM_DISMISSED) {
      // Unfreeze seller
      await User.findByIdAndUpdate(dispute.sellerId, {
        $set: { isFrozen: false }
      });

      dispute.status = 'rejected';
      dispute.resolutionAction = DisputeResolution.CLAIM_DISMISSED;
      await Deal.findByIdAndUpdate(dispute.dealId, {
        $set: { disputeStatus: DisputeStatus.RESOLVED }
      });
    } else if (resolutionAction === DisputeResolution.LEGAL_HOLD) {
      // Keep seller frozen for ongoing police investigation
      await User.findByIdAndUpdate(dispute.sellerId, {
        $set: { isFrozen: true }
      });

      dispute.status = 'escalated_to_police';
      dispute.resolutionAction = DisputeResolution.LEGAL_HOLD;
      await Deal.findByIdAndUpdate(dispute.dealId, {
        $set: { disputeStatus: DisputeStatus.UNDER_REVIEW }
      });
    }

    dispute.resolvedBy = superAdminId;
    await dispute.save();

    sendSuccess(
      res,
      {
        disputeId: dispute._id.toString(),
        dealId: dispute.dealId.toString(),
        status: dispute.status,
        resolutionAction: dispute.resolutionAction,
        resolvedBy: superAdminId.toString()
      },
      200,
      'Dispute resolved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// 13.8 — Propose Permanent Citizen Ban (POST /api/v1/admin/users/:userId/propose-ban)
// Step 1 of Dual-Approval Ban Workflow (Moderator)
// ---------------------------------------------------------------------------
export const proposeBan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const { reason } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundError('User not found', ErrorCodes.NOT_FOUND);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.NOT_FOUND);
    }

    if (user.isBanned) {
      throw new ConflictError('User is already permanently banned', ErrorCodes.USER_ALREADY_BANNED);
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestError('Cannot ban a Super Admin', ErrorCodes.CANNOT_BAN_ADMIN);
    }

    user.banProposedBy = new mongoose.Types.ObjectId(req.user!.userId);
    user.banReason = reason;
    await user.save();

    sendSuccess(
      res,
      {
        userId: user._id.toString(),
        banProposedBy: req.user!.userId,
        status: 'BAN_PROPOSED'
      },
      200,
      'Permanent ban proposal recorded. Awaiting Super Admin approval.'
    );
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// 13.9 — Confirm Permanent Citizen Ban (POST /api/v1/admin/users/:userId/confirm-ban)
// Step 2 of Dual-Approval Ban Workflow (Super Admin)
// ---------------------------------------------------------------------------
export const confirmBan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundError('User not found', ErrorCodes.NOT_FOUND);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.NOT_FOUND);
    }

    // Dual-Approval Verification: Must have been proposed by a moderator
    if (!user.banProposedBy) {
      throw new ConflictError(
        'Dual-approval violation: A moderator must propose the ban before Super Admin confirmation.',
        ErrorCodes.BAN_PROPOSAL_REQUIRED
      );
    }

    // (a) Mark user as banned
    user.isBanned = true;
    user.bannedAt = new Date();
    await user.save();

    // (b) Add to Cryptographic Blacklist (NID hash, phone, devices)
    const nidHash = user.nidHash || `unverified_${user._id.toString()}`;
    const deviceUUID = user.deviceUUIDs?.[0] || null;

    await NidBlacklist.findOneAndUpdate(
      { phone: user.phone },
      {
        $setOnInsert: {
          nidHash,
          phone: user.phone,
          deviceUUID,
          reason: user.banReason || 'Administrative termination',
          bannedBy: new mongoose.Types.ObjectId(req.user!.userId)
        }
      },
      { upsert: true }
    );

    // (c) Archive all active/under_offer/under_review listings
    await Listing.updateMany(
      {
        sellerId: user._id,
        status: { $in: [ListingStatus.ACTIVE, ListingStatus.UNDER_OFFER, ListingStatus.UNDER_REVIEW] }
      },
      { $set: { status: ListingStatus.ARCHIVED } }
    );

    // (d) Revoke refresh tokens and family in Redis
    try {
      const redis = getRedisClient();
      await redis.del(`refresh_token:${user._id.toString()}`);
      await redis.del(`token_family:${user._id.toString()}`);
    } catch {
      // Redis token invalidation best effort in test/isolated environments
    }

    sendSuccess(
      res,
      {
        userId: user._id.toString(),
        isBanned: true,
        bannedAt: user.bannedAt,
        blacklistedNidHash: user.nidHash ?? null,
        blacklistedPhone: user.phone,
        blacklistedDevices: user.deviceUUIDs
      },
      200,
      'Citizen permanently banned and added to cryptographic blacklist.'
    );
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// 13.10 — Phone Reveal Bot Detection Audits (GET /api/v1/admin/audits/phone-reveals)
// Super Admin only
// ---------------------------------------------------------------------------
export const getPhoneRevealAudits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Group phone reveals by buyerId within rolling 24 hours to flag potential scraping bots
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const aggregates = await PhoneRevealAudit.aggregate([
      { $match: { createdAt: { $gte: past24h } } },
      {
        $group: {
          _id: '$buyerId',
          revealCount: { $sum: 1 },
          lastRevealedAt: { $max: '$createdAt' },
          ipAddresses: { $addToSet: '$ipAddress' }
        }
      },
      { $sort: { revealCount: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'buyer'
        }
      },
      { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          buyerId: '$_id',
          displayName: '$buyer.displayName',
          phone: '$buyer.phone',
          isNidVerified: '$buyer.isNidVerified',
          revealCount: 1,
          lastRevealedAt: 1,
          ipAddresses: 1,
          isAnomaly: { $gt: ['$revealCount', 8] } // Flag anomalies > 8 reveals/day
        }
      }
    ]);

    sendSuccess(res, aggregates, 200, 'Phone reveal audit statistics retrieved');
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Ad / Listing Moderation Queue (Admin Review before ad is published)
// ---------------------------------------------------------------------------
export const getListingModerationQueue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {
      deletedAt: null
    };

    if (status === 'pending') {
      filter.$or = [
        { moderationStatus: ModerationStatus.PENDING },
        { status: ListingStatus.UNDER_REVIEW }
      ];
    } else if (status === 'approved') {
      filter.moderationStatus = ModerationStatus.APPROVED;
      filter.status = ListingStatus.ACTIVE;
    } else if (status === 'rejected') {
      filter.moderationStatus = ModerationStatus.REJECTED;
    }

    const totalCount = await Listing.countDocuments(filter);
    const listings = await Listing.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('sellerId', 'displayName phone isNidVerified role avatarUrl createdAt')
      .lean();

    const formatted = listings.map((l: any) => ({
      id: l._id,
      title: l.title,
      description: l.description,
      price: l.price,
      condition: l.condition,
      category: l.category,
      location: l.location,
      imageUrls: l.imageUrls,
      videoUrl: l.videoUrl || null,
      status: l.status,
      moderationStatus: l.moderationStatus,
      createdAt: l.createdAt,
      seller: l.sellerId
        ? {
            id: l.sellerId._id,
            displayName: l.sellerId.displayName,
            phone: l.sellerId.phone,
            isNidVerified: l.sellerId.isNidVerified,
            role: l.sellerId.role,
            memberSince: l.sellerId.createdAt
          }
        : null
    }));

    sendSuccess(res, formatted, 200, 'Listing moderation queue retrieved successfully', {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum)
    });
  } catch (error) {
    next(error);
  }
};

export const approveListing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;

    const listing = await Listing.findById(id);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    listing.status = ListingStatus.ACTIVE;
    listing.moderationStatus = ModerationStatus.APPROVED;
    await listing.save();

    logger.info(`Listing ${id} approved by admin/moderator ${adminId}`);

    sendSuccess(
      res,
      {
        id: listing._id,
        status: listing.status,
        moderationStatus: listing.moderationStatus,
        approvedAt: new Date().toISOString()
      },
      200,
      'Listing approved successfully and is now live on the marketplace.'
    );
  } catch (error) {
    next(error);
  }
};

export const rejectListing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;
    const { reason } = req.body;

    const listing = await Listing.findById(id);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    listing.status = ListingStatus.ARCHIVED;
    listing.moderationStatus = ModerationStatus.REJECTED;
    await listing.save();

    logger.info(
      `Listing ${id} rejected by admin/moderator ${adminId}. Reason: ${reason || 'Not specified'}`
    );

    sendSuccess(
      res,
      {
        id: listing._id,
        status: listing.status,
        moderationStatus: listing.moderationStatus,
        rejectedAt: new Date().toISOString()
      },
      200,
      'Listing rejected successfully.'
    );
  } catch (error) {
    next(error);
  }
};
