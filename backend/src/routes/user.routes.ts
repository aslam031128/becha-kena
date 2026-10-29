import { Router } from 'express';
import { getMyProfile } from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Get currently authenticated citizen's full profile
 * @access  Authenticated
 */
router.get('/me', requireAuth, getMyProfile);

export default router;
