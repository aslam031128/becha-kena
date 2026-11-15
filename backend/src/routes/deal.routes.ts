import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.js';
import { requireVerifiedCitizen } from '../middlewares/rbac.js';
import { validateBody } from '../middlewares/validation.js';
import { closeDeal, directSale, getDeal, getDeals } from '../controllers/deal.controller.js';
import { submitReview } from '../controllers/review.controller.js';
import { fileDispute, getDispute } from '../controllers/dispute.controller.js';

const router = Router();

const fileDisputeSchema = z.object({
  gdNumber: z.string({ required_error: 'GD number is required' }).min(3, 'GD number must be at least 3 characters'),
  thanaName: z.string({ required_error: 'Thana name is required' }).min(2, 'Thana name must be at least 2 characters'),
  gdFilingDate: z.string({ required_error: 'GD filing date is required' }),
  gdDocumentUrl: z.string({ required_error: 'GD document URL is required' }).url('Invalid GD document URL')
});

/**
 * @route   GET /api/v1/deals
 * @desc    Get all deals for the authenticated user
 * @access  Authenticated
 */
router.get('/', requireAuth, getDeals);

/**
 * @route   POST /api/v1/deals
 * @desc    Close a deal from an accepted offer (seller only)
 * @access  Authenticated + Verified Citizen
 */
router.post('/', requireAuth, requireVerifiedCitizen, closeDeal);

/**
 * @route   POST /api/v1/deals/direct-sale
 * @desc    Seller-initiated direct sale without a prior offer (conversation required)
 * @access  Authenticated + Verified Citizen
 */
router.post('/direct-sale', requireAuth, requireVerifiedCitizen, directSale);

/**
 * @route   GET /api/v1/deals/:dealId
 * @desc    Retrieve populated deal receipt (seller or buyer only)
 * @access  Authenticated
 */
router.get('/:dealId', requireAuth, getDeal);

/**
 * @route   POST /api/v1/deals/:dealId/reviews
 * @desc    Submit bilateral post-deal review (48h window)
 * @access  Authenticated + Verified Citizen
 */
router.post('/:dealId/reviews', requireAuth, requireVerifiedCitizen, submitReview);

/**
 * @route   POST /api/v1/deals/:dealId/disputes
 * @desc    File a post-deal stolen item police GD legal dispute (buyer only)
 * @access  Authenticated + Verified Citizen
 */
router.post('/:dealId/disputes', requireAuth, requireVerifiedCitizen, validateBody(fileDisputeSchema), fileDispute);

/**
 * @route   GET /api/v1/deals/:dealId/dispute
 * @desc    Get dispute status and details (buyer, seller, or admin/moderator)
 * @access  Authenticated
 */
router.get('/:dealId/dispute', requireAuth, getDispute);
router.get('/:dealId/disputes', requireAuth, getDispute);

export default router;
