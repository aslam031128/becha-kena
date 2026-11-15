import { Router } from 'express';
import {
  getMyProfile,
  updateProfile,
  updateNotificationPreferences
} from '../controllers/user.controller.js';
import { getUserReviews } from '../controllers/review.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Get currently authenticated citizen's full profile
 * @access  Authenticated
 */
router.get('/me', requireAuth, getMyProfile);

/**
 * @route   PATCH /api/v1/users/me/profile
 * @desc    Update citizen display name or avatar
 * @access  Authenticated
 */
router.patch('/me/profile', requireAuth, updateProfile);

/**
 * @route   PATCH /api/v1/users/me/notification-preferences
 * @desc    Update citizen notification preferences
 * @access  Authenticated
 */
router.patch('/me/notification-preferences', requireAuth, updateNotificationPreferences);

/**
 * @route   GET /api/v1/users/:userId/reviews
 * @desc    Get all reviews left for a specific user (publicly accessible)
 * @access  Public
 */
router.get('/:userId/reviews', getUserReviews);

export default router;
