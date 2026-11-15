import { Router } from 'express';
import {
  addFavorite,
  removeFavorite,
  getFavorites
} from '../controllers/favorite.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireVerifiedCitizen } from '../middlewares/rbac.js';

const router = Router();

/**
 * @route   GET /api/v1/favorites
 * @desc    Fetch user's saved favorites with price drop indicators
 * @access  Authenticated
 */
router.get('/', requireAuth, getFavorites);

/**
 * @route   POST /api/v1/favorites/:listingId
 * @desc    Save listing to favorites
 * @access  Verified Citizen
 */
router.post('/:listingId', requireAuth, requireVerifiedCitizen, addFavorite);

/**
 * @route   DELETE /api/v1/favorites/:listingId
 * @desc    Remove listing from favorites
 * @access  Verified Citizen
 */
router.delete('/:listingId', requireAuth, requireVerifiedCitizen, removeFavorite);

export default router;

