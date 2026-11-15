import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validateBody } from '../middlewares/validation.js';
import { UserRole, DisputeResolution } from '../constants/enums.js';
import {
  getKycQueue,
  approveKyc,
  rejectKyc,
  getAdminReports,
  actionReport,
  getAdminDisputes,
  resolveDispute,
  proposeBan,
  confirmBan,
  getPhoneRevealAudits,
  getListingModerationQueue,
  approveListing,
  rejectListing
} from '../controllers/admin.controller.js';

const router = Router();

// Middlewares for role enforcement
const requireModeratorOrAdmin = requireRole([UserRole.MODERATOR, UserRole.SUPER_ADMIN]);
const requireSuperAdminOnly = requireRole(UserRole.SUPER_ADMIN);

// Schemas
const rejectKycSchema = z.object({
  reason: z.string().optional()
});

const actionReportSchema = z.object({
  action: z.enum(['dismiss', 'quarantine', 'warn', 'escalate'], {
    errorMap: () => ({ message: 'Action must be one of: dismiss, quarantine, warn, escalate' })
  }),
  notes: z.string().optional()
});

const resolveDisputeSchema = z.object({
  resolutionAction: z.nativeEnum(DisputeResolution, {
    errorMap: () => ({ message: 'Invalid dispute resolution action' })
  })
});

const proposeBanSchema = z.object({
  reason: z
    .string({ required_error: 'Ban reason is required' })
    .min(5, 'Ban reason must be at least 5 characters')
    .max(200, 'Ban reason cannot exceed 200 characters')
});

// ---------------------------------------------------------------------------
// 1. KYC Review Queue & Decision Endpoints
// ---------------------------------------------------------------------------
router.get('/kyc/queue', requireAuth, requireModeratorOrAdmin, getKycQueue);
router.patch('/kyc/:userId/approve', requireAuth, requireModeratorOrAdmin, approveKyc);
router.patch(
  '/kyc/:userId/reject',
  requireAuth,
  requireModeratorOrAdmin,
  validateBody(rejectKycSchema),
  rejectKyc
);

// ---------------------------------------------------------------------------
// 2. Community Reports Triage
// ---------------------------------------------------------------------------
router.get('/reports', requireAuth, requireModeratorOrAdmin, getAdminReports);
router.patch(
  '/reports/:reportId/action',
  requireAuth,
  requireModeratorOrAdmin,
  validateBody(actionReportSchema),
  actionReport
);

// ---------------------------------------------------------------------------
// 3. Stolen Item Police GD Disputes
// ---------------------------------------------------------------------------
router.get('/disputes', requireAuth, requireModeratorOrAdmin, getAdminDisputes);
router.patch(
  '/disputes/:disputeId/resolve',
  requireAuth,
  requireSuperAdminOnly,
  validateBody(resolveDisputeSchema),
  resolveDispute
);

// ---------------------------------------------------------------------------
// 4. Dual-Approval Citizen Ban System
// ---------------------------------------------------------------------------
router.post(
  '/users/:userId/propose-ban',
  requireAuth,
  requireModeratorOrAdmin,
  validateBody(proposeBanSchema),
  proposeBan
);

router.post(
  '/users/:userId/confirm-ban',
  requireAuth,
  requireSuperAdminOnly,
  confirmBan
);

// ---------------------------------------------------------------------------
// 5. Forensics & Audit Logs
// ---------------------------------------------------------------------------
router.get('/audits/phone-reveals', requireAuth, requireSuperAdminOnly, getPhoneRevealAudits);

// ---------------------------------------------------------------------------
// 6. Ad / Listing Moderation Queue & Approvals
// ---------------------------------------------------------------------------
router.get('/listings/queue', requireAuth, requireModeratorOrAdmin, getListingModerationQueue);
router.patch('/listings/:id/approve', requireAuth, requireModeratorOrAdmin, approveListing);
router.patch('/listings/:id/reject', requireAuth, requireModeratorOrAdmin, rejectListing);

export default router;

