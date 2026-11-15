import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.js';
import { requireVerifiedCitizen } from '../middlewares/rbac.js';
import { validateBody } from '../middlewares/validation.js';
import { submitReport, getMyReports } from '../controllers/report.controller.js';
import { ReportEntityType, ReportReason } from '../constants/enums.js';

const router = Router();

const submitReportSchema = z.object({
  entityType: z.nativeEnum(ReportEntityType, {
    errorMap: () => ({ message: 'Invalid entityType. Must be listing, chat, or user.' })
  }),
  entityId: z
    .string({ required_error: 'entityId is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid entityId format'),
  reason: z.nativeEnum(ReportReason, {
    errorMap: () => ({ message: 'Invalid report reason.' })
  }),
  details: z
    .string({ required_error: 'details are required' })
    .min(5, 'Details must be at least 5 characters')
    .max(500, 'Details cannot exceed 500 characters')
});

/**
 * @route   POST /api/v1/reports
 * @desc    Submit a community safety report with auto-quarantine trigger (>=3 reports)
 * @access  Authenticated + Verified Citizen
 */
router.post('/', requireAuth, requireVerifiedCitizen, validateBody(submitReportSchema), submitReport);

/**
 * @route   GET /api/v1/reports/me
 * @desc    Retrieve all reports filed by the authenticated citizen
 * @access  Authenticated
 */
router.get('/me', requireAuth, getMyReports);

export default router;

