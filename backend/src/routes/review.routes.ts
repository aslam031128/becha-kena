import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireVerifiedCitizen } from '../middlewares/rbac.js';
import { submitReview } from '../controllers/review.controller.js';

const router = Router();

/**
 * @route   POST /api/v1/reviews
 * @desc    Submit bilateral post-deal review (48h window, gated by deal)
 * @access  Authenticated + Verified Citizen
 */
router.post('/', requireAuth, requireVerifiedCitizen, submitReview);

export default router;

